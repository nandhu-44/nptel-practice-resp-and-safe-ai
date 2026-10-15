"use client";

import confetti from "canvas-confetti";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Layers,
  RotateCcw,
  Shuffle,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import CatMeme, { pickCaption } from "../components/cat-meme";
import { LectureSources } from "../components/explanation";

const progressKey = "nptel-flashcards";

function shuffleList(list) {
  const shuffled = [...list];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

export default function Flashcards({ weeks, onHome }) {
  const [cards, setCards] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [progress, setProgress] = useState({});
  const [deckWeek, setDeckWeek] = useState("all");
  const [shuffle, setShuffle] = useState(true);
  const [weakOnly, setWeakOnly] = useState(false);
  const [deck, setDeck] = useState(null);
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [reaction, setReaction] = useState({ mood: "idle", seed: 0 });
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/flashcards")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setCards(data.cards);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Unable to load flashcards.");
      });
    try {
      const stored = JSON.parse(localStorage.getItem(progressKey) ?? "{}");
      if (stored && typeof stored === "object") setProgress(stored);
    } catch {
      localStorage.removeItem(progressKey);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const cardsById = useMemo(
    () => new Map(cards.map((card) => [card.id, card])),
    [cards],
  );
  const poolForSetup = useMemo(
    () =>
      cards.filter(
        (card) =>
          (deckWeek === "all" || card.week === Number(deckWeek)) &&
          (!weakOnly || progress[card.id] !== "known"),
      ),
    [cards, deckWeek, weakOnly, progress],
  );
  const knownCount = cards.filter(
    (card) => progress[card.id] === "known",
  ).length;
  const learningCount = cards.filter(
    (card) => progress[card.id] === "learning",
  ).length;

  function startDeck() {
    if (!poolForSetup.length) return;
    const ordered = shuffle ? shuffleList(poolForSetup) : poolForSetup;
    setDeck(ordered.map((card) => card.id));
    setPosition(0);
    setFlipped(false);
    setStreak(0);
    setBestStreak(0);
    setFinished(false);
    setReaction({ mood: "idle", seed: Math.floor(Math.random() * 100) });
  }

  function leaveDeck({ weakOnly: nextWeakOnly }) {
    setWeakOnly(nextWeakOnly);
    setDeck(null);
    setFinished(false);
  }

  const rate = useCallback(
    (status) => {
      if (!deck || finished) return;
      const id = deck[position];
      const next = { ...progress, [id]: status };
      setProgress(next);
      try {
        localStorage.setItem(progressKey, JSON.stringify(next));
      } catch {
        // Storage can be unavailable (private mode); progress stays in memory.
      }

      const seed = Math.floor(Math.random() * 100);
      if (status === "known") {
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        setBestStreak((best) => Math.max(best, nextStreak));
        setReaction({ mood: nextStreak >= 3 ? "smug" : "happy", seed });
      } else {
        setStreak(0);
        setReaction({ mood: seed % 2 ? "shocked" : "grumpy", seed });
      }

      if (position >= deck.length - 1) {
        setFinished(true);
        setReaction({ mood: "party", seed });
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.65 },
          colors: ["#c4578f", "#e8a15b", "#7fcf9f", "#faf9f7"],
        });
      } else {
        setPosition(position + 1);
        setFlipped(false);
      }
    },
    [deck, finished, position, progress, streak],
  );

  useEffect(() => {
    if (!deck || finished) return undefined;
    function onKey(event) {
      const onButton =
        event.target instanceof HTMLElement && event.target.closest("button");
      const isFlipKey = event.key === " " || event.key === "Enter";
      // Let a focused button handle its own Space/Enter activation.
      if (onButton && isFlipKey) return;
      if (event.target instanceof HTMLSelectElement) return;
      if (isFlipKey) {
        event.preventDefault();
        setFlipped((value) => !value);
      } else if (event.key === "ArrowRight" && position < deck.length - 1) {
        setPosition(position + 1);
        setFlipped(false);
      } else if (event.key === "ArrowLeft" && position > 0) {
        setPosition(position - 1);
        setFlipped(false);
      } else if (flipped && event.key === "1") rate("learning");
      else if (flipped && event.key === "2") rate("known");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deck, finished, flipped, position, rate]);

  function resetProgress() {
    setProgress({});
    try {
      localStorage.removeItem(progressKey);
    } catch {
      // ignore
    }
  }

  const card = deck ? cardsById.get(deck[position]) : null;
  const caption = pickCaption(reaction.mood, reaction.seed);
  const playing = Boolean(deck && !finished);

  return (
    <>
      <button
        className="back-link"
        onClick={playing ? () => leaveDeck({ weakOnly }) : onHome}
        type="button"
      >
        <ArrowLeft size={14} /> {playing ? "END DECK" : "COURSE HOME"}
      </button>
      {!playing && (
        <div className="study-heading">
          <div>
            <span className="eyebrow">FLASHCARDS · ACTIVE RECALL</span>
            <h1>Flashcards</h1>
            <p>
              Flip each card, then be honest. Cards you miss come back; cards
              you know earn a cat&apos;s approval.
            </p>
          </div>
          <span className="study-count">{cards.length} CARDS</span>
        </div>
      )}
      {loadError && (
        <p className="error-message" role="alert">
          {loadError}
        </p>
      )}

      {!playing && (
        <div className="fc-stats">
          <div>
            <span className="eyebrow">MASTERED</span>
            <strong>{knownCount}</strong>
          </div>
          <div>
            <span className="eyebrow">STILL LEARNING</span>
            <strong>{learningCount}</strong>
          </div>
          <div>
            <span className="eyebrow">NEW</span>
            <strong>
              {Math.max(0, cards.length - knownCount - learningCount)}
            </strong>
          </div>
          <div className="score-meter fc-meter">
            <i
              style={{
                width: `${cards.length ? (knownCount / cards.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {!deck && (
        <section className="fc-setup">
          <div className="fc-setup-main">
            <span className="eyebrow">BUILD A DECK</span>
            <label className="fc-field">
              <span>Deck</span>
              <select
                value={deckWeek}
                onChange={(event) => setDeckWeek(event.target.value)}
              >
                <option value="all">All weeks</option>
                {weeks.map((item) => (
                  <option key={item.week} value={item.week}>
                    Week {String(item.week).padStart(2, "0")} · {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="setting-row">
              <span>
                <b>Shuffle cards</b>
                <small>Random order every run</small>
              </span>
              <input
                type="checkbox"
                checked={shuffle}
                onChange={(event) => setShuffle(event.target.checked)}
              />
            </label>
            <label className="setting-row">
              <span>
                <b>Skip mastered cards</b>
                <small>Only new and still-learning cards</small>
              </span>
              <input
                type="checkbox"
                checked={weakOnly}
                onChange={(event) => setWeakOnly(event.target.checked)}
              />
            </label>
            <div className="fc-setup-actions">
              <button
                className="primary-button"
                disabled={!poolForSetup.length}
                onClick={startDeck}
                type="button"
              >
                <Layers size={15} />{" "}
                {poolForSetup.length
                  ? `Start ${poolForSetup.length} cards`
                  : "Nothing to review"}
                <ArrowRight size={15} />
              </button>
              <button
                className="secondary-button"
                disabled={!knownCount && !learningCount}
                onClick={resetProgress}
                type="button"
              >
                <RotateCcw size={14} /> Reset progress
              </button>
            </div>
          </div>
          <CatMeme mood="sleepy" caption={pickCaption("sleepy", 1)} />
        </section>
      )}

      {deck && !finished && card && (
        <section className="fc-play">
          <div className="fc-play-main">
            <div className="fc-topline">
              <span className="eyebrow">
                CARD {String(position + 1).padStart(2, "0")}{" "}
                <span>/ {deck.length}</span>
              </span>
              <span className="eyebrow">
                STREAK <b className="fc-streak">{streak}</b> · BEST {bestStreak}
              </span>
            </div>
            <div className="score-meter">
              <i style={{ width: `${(position / deck.length) * 100}%` }} />
            </div>
            <button
              className={`fc-card ${flipped ? "is-flipped" : ""}`}
              onClick={() => setFlipped((value) => !value)}
              type="button"
              aria-label={flipped ? "Show question" : "Reveal answer"}
            >
              <span className="fc-face fc-front" aria-hidden={flipped}>
                <span className="question-meta">
                  WEEK {String(card.week).padStart(2, "0")} · Q
                  {String(card.number).padStart(2, "0")}{" "}
                  <span>
                    {card.type === "MSQ" ? "SELECT ALL THAT APPLY" : "QUESTION"}
                  </span>
                </span>
                <span className="fc-question">{card.question}</span>
                {card.options?.length > 0 && (
                  <span className="fc-options">
                    {card.options.map((option) => (
                      <span key={option.option}>
                        <i>{option.option.toUpperCase()}</i>
                        {option.text}
                      </span>
                    ))}
                  </span>
                )}
                <span className="fc-hint">TAP OR PRESS SPACE TO FLIP</span>
              </span>
              <span className="fc-face fc-back" aria-hidden={!flipped}>
                <span className="eyebrow">
                  {card.correctAnswers.length > 1
                    ? "CORRECT ANSWERS"
                    : "CORRECT ANSWER"}
                </span>
                <span className="fc-answer">
                  {card.answerTexts.map((text) => (
                    <span key={text}>
                      {text.replace(/^([a-z])\.\s*/i, "($1) ")}
                    </span>
                  ))}
                </span>
                {card.explanationDetail.text && (
                  <span className="fc-explanation">
                    {card.explanationDetail.text}
                  </span>
                )}
              </span>
            </button>
            {flipped && <LectureSources detail={card.explanationDetail} />}
            <div className="fc-controls">
              <button
                className="secondary-button"
                disabled={position === 0}
                onClick={() => {
                  setPosition(position - 1);
                  setFlipped(false);
                }}
                type="button"
              >
                <ArrowLeft size={15} /> Back
              </button>
              <button
                className="fc-rate fc-rate-learning"
                disabled={!flipped}
                onClick={() => rate("learning")}
                type="button"
              >
                <X size={15} /> Still learning <kbd>1</kbd>
              </button>
              <button
                className="fc-rate fc-rate-known"
                disabled={!flipped}
                onClick={() => rate("known")}
                type="button"
              >
                <Check size={15} /> Got it <kbd>2</kbd>
              </button>
            </div>
            <CatMeme mood={reaction.mood} caption={caption} size="sm" />
          </div>
        </section>
      )}

      {deck && finished && (
        <section className="fc-setup">
          <div className="fc-setup-main">
            <span className="eyebrow">DECK COMPLETE</span>
            <h2 className="fc-done-title">Deck cleared.</h2>
            <p className="fc-done-copy">
              {deck.length} cards reviewed · best streak {bestStreak}.{" "}
              {deck.filter((id) => progress[id] === "learning").length} still
              need work.
            </p>
            <div className="fc-setup-actions">
              <button
                className="primary-button"
                onClick={() => leaveDeck({ weakOnly: true })}
                type="button"
              >
                <Shuffle size={15} /> Review the weak ones
              </button>
              <button
                className="secondary-button"
                onClick={() => leaveDeck({ weakOnly: false })}
                type="button"
              >
                New deck
              </button>
            </div>
          </div>
          <CatMeme mood="party" caption={caption} />
        </section>
      )}
    </>
  );
}
