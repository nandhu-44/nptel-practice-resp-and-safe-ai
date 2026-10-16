"use client";

import { ArrowLeft, Search as SearchIcon } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Explanation from "./explanation";

const pageSize = 20;

function tokenize(query) {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

function countMatches(text, token) {
  return text.split(token).length - 1;
}

// Every token must appear somewhere; question text counts the most.
function scoreCard(card, tokens) {
  const fields = [
    [card.question.toLowerCase(), 4],
    [card.answerTexts.join(" ").toLowerCase(), 3],
    [card.explanationDetail.text.toLowerCase(), 2],
    [
      (card.options ?? [])
        .map((option) => option.text)
        .join(" ")
        .toLowerCase(),
      1,
    ],
    [
      card.explanationDetail.sources
        .map((s) => s.lecture)
        .join(" ")
        .toLowerCase(),
      1,
    ],
  ];
  let total = 0;
  for (const token of tokens) {
    const tokenScore = fields.reduce(
      (sum, [text, weight]) => sum + (countMatches(text, token) ? weight : 0),
      0,
    );
    if (!tokenScore) return 0;
    total += tokenScore;
  }
  return total;
}

function Highlight({ text, pattern }) {
  if (!pattern) return text;
  return text
    .split(pattern)
    .map((part, i) =>
      i % 2 ? <mark key={`${i}-${part}`}>{part}</mark> : part,
    );
}

function buildPattern(tokens) {
  if (!tokens.length) return null;
  const escaped = tokens.map((token) =>
    token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  return new RegExp(`(${escaped.join("|")})`, "gi");
}

export default function Search({ weeks, onHome }) {
  const [cards, setCards] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [week, setWeek] = useState("all");
  const [visible, setVisible] = useState(pageSize);
  const inputRef = useRef(null);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    inputRef.current?.focus();
    let cancelled = false;
    fetch("/api/flashcards")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setCards(data.cards);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Unable to load questions.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tokens = useMemo(() => tokenize(deferredQuery), [deferredQuery]);
  const pattern = useMemo(() => buildPattern(tokens), [tokens]);
  const results = useMemo(() => {
    if (!tokens.length) return [];
    return cards
      .filter((card) => week === "all" || card.week === Number(week))
      .map((card) => ({ card, score: scoreCard(card, tokens) }))
      .filter((entry) => entry.score > 0)
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.card.week - right.card.week ||
          left.card.number - right.card.number,
      )
      .map((entry) => entry.card);
  }, [cards, tokens, week]);

  return (
    <>
      <button className="back-link" onClick={onHome} type="button">
        <ArrowLeft size={14} /> COURSE HOME
      </button>
      <div className="study-heading">
        <div>
          <span className="eyebrow">SEARCH · QUESTIONS &amp; EXPLANATIONS</span>
          <h1>Search</h1>
          <p>
            Look up a topic across every question, answer and explanation.
            Results show the correct answer and the lecture clip.
          </p>
        </div>
        <span className="study-count">{cards.length} QUESTIONS</span>
      </div>
      <div className="search-bar">
        <label className="search-input">
          <SearchIcon size={16} aria-hidden="true" />
          <input
            aria-label="Search questions and explanations"
            autoComplete="off"
            onChange={(event) => {
              setQuery(event.target.value);
              setVisible(pageSize);
            }}
            placeholder="e.g. differential privacy, FORGE, deceptive alignment"
            ref={inputRef}
            type="search"
            value={query}
          />
        </label>
        <select
          aria-label="Filter by week"
          className="search-week"
          onChange={(event) => {
            setWeek(event.target.value);
            setVisible(pageSize);
          }}
          value={week}
        >
          <option value="all">All weeks</option>
          {weeks.map((item) => (
            <option key={item.week} value={item.week}>
              Week {String(item.week).padStart(2, "0")}
            </option>
          ))}
        </select>
      </div>
      {loadError && (
        <p className="error-message" role="alert">
          {loadError}
        </p>
      )}
      {tokens.length > 0 && (
        <p className="search-count" aria-live="polite">
          {results.length} {results.length === 1 ? "RESULT" : "RESULTS"}
        </p>
      )}
      <div className="study-list">
        {results.slice(0, visible).map((card) => (
          <article className="study-item" key={card.id}>
            <div className="study-item-meta">
              WEEK {String(card.week).padStart(2, "0")} · Q
              {String(card.number).padStart(2, "0")} <span>{card.type}</span>
            </div>
            <h2>
              <Highlight pattern={pattern} text={card.question} />
            </h2>
            {card.options?.length > 0 && (
              <ul className="study-options">
                {card.options.map((option) => (
                  <li
                    className={
                      card.correctAnswers.includes(option.option)
                        ? "is-correct"
                        : ""
                    }
                    key={option.option}
                  >
                    <span>{option.option.toUpperCase()}</span>
                    <p className="study-option-text">
                      <Highlight pattern={pattern} text={option.text} />
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Explanation detail={card.explanationDetail} />
          </article>
        ))}
      </div>
      {results.length > visible && (
        <button
          className="secondary-button search-more"
          onClick={() => setVisible((count) => count + pageSize)}
          type="button"
        >
          Show {Math.min(pageSize, results.length - visible)} more
        </button>
      )}
      {tokens.length > 0 && !results.length && cards.length > 0 && (
        <p className="search-empty">
          No questions match “{deferredQuery.trim()}”. Try fewer or simpler
          words.
        </p>
      )}
    </>
  );
}
