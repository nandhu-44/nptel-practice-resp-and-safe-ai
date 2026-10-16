"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  RotateCcw,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Explanation from "./explanation";

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

function hasAnswer(value) {
  return Array.isArray(value)
    ? value.length > 0
    : String(value ?? "").trim().length > 0;
}

function formatAnswer(text) {
  return text.replace(/^([a-z])\.\s*/i, "($1) ");
}

// Practice run over every question you have gotten wrong. Answering one
// correctly removes it from the mistakes list.
export default function Mistakes({ mistakes, onRecord, onHome }) {
  const [catalog, setCatalog] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [session, setSession] = useState(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/quiz/exam")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) {
          setCatalog(new Map(data.questions.map((item) => [item.id, item])));
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError("Unable to load questions.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pool = useMemo(
    () =>
      catalog ? Object.keys(mistakes).filter((id) => catalog.has(id)) : [],
    [catalog, mistakes],
  );

  const questions = session?.map((id) => catalog.get(id)) ?? [];
  const question = questions[index];
  const current = question ? feedback[question.id] : null;
  const finished = session && index >= questions.length;
  const fixed = Object.values(feedback).filter((item) => item.isCorrect).length;

  function startSession() {
    setSession(shuffleList(pool));
    setIndex(0);
    setAnswers({});
    setFeedback({});
    setError("");
  }

  function chooseOption(value, multiple) {
    if (current) return;
    setAnswers((old) => {
      if (!multiple) return { ...old, [question.id]: value };
      const selected = old[question.id] ?? [];
      return {
        ...old,
        [question.id]: selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value],
      };
    });
  }

  async function check() {
    if (current || !hasAnswer(answers[question.id])) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/quiz/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          answer: answers[question.id],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setFeedback((old) => ({ ...old, [question.id]: data }));
      onRecord([data]);
    } catch (issue) {
      setError(issue.message || "Unable to check this answer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className="back-link"
        onClick={session && !finished ? () => setSession(null) : onHome}
        type="button"
      >
        <ArrowLeft size={14} />{" "}
        {session && !finished ? "END SESSION" : "COURSE HOME"}
      </button>

      {!session && (
        <>
          <div className="study-heading">
            <div>
              <span className="eyebrow">MISTAKES · TARGETED PRACTICE</span>
              <h1>Mistakes</h1>
              <p>
                Every question you have answered wrong in an assignment or exam.
                Get one right and it leaves this list.
              </p>
            </div>
            <span className="study-count">{pool.length} TO REVISIT</span>
          </div>
          {loadError && (
            <p className="error-message" role="alert">
              {loadError}
            </p>
          )}
          <section className="fc-setup">
            <div className="fc-setup-main">
              <span className="eyebrow">RETRY SESSION</span>
              <p className="fc-done-copy">
                {!catalog
                  ? "Loading questions…"
                  : pool.length
                    ? `${pool.length} question${pool.length === 1 ? "" : "s"} from your past attempts, in random order. Answers are checked one at a time.`
                    : "Nothing to revisit. Wrong answers from assignments and exams will show up here."}
              </p>
              <div className="fc-setup-actions">
                <button
                  className="primary-button"
                  disabled={!pool.length}
                  onClick={startSession}
                  type="button"
                >
                  <RotateCcw size={15} /> Practise {pool.length || ""} mistakes{" "}
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {session && question && (
        <>
          <div className="quiz-heading">
            <div>
              <span className="eyebrow">
                RETRY {String(index + 1).padStart(2, "0")}{" "}
                <span>/ {questions.length}</span>
              </span>
              <h1>Mistakes practice</h1>
            </div>
            <div className="quiz-heading-actions">
              <span className="eyebrow">
                {String(fixed).padStart(2, "0")} FIXED
              </span>
            </div>
          </div>
          <article className="question-frame">
            <div className="question-meta">
              WEEK {String(question.week).padStart(2, "0")} · Q
              {String(question.number).padStart(2, "0")}{" "}
              <span>
                {question.type === "MSQ"
                  ? "SELECT ALL THAT APPLY"
                  : question.options?.length
                    ? "SINGLE ANSWER"
                    : "NUMERICAL ANSWER"}
              </span>
            </div>
            <h2>{question.question}</h2>
            {question.options?.length ? (
              <div className="answer-list">
                {question.options.map((option) => {
                  const multiple = question.type === "MSQ";
                  const selected = multiple
                    ? (answers[question.id] ?? []).includes(option.option)
                    : answers[question.id] === option.option;
                  return (
                    <button
                      key={option.option}
                      className={`answer-option ${selected ? "is-selected" : ""}`}
                      onClick={() => chooseOption(option.option, multiple)}
                      type="button"
                      disabled={Boolean(current)}
                      aria-pressed={selected}
                    >
                      <span
                        className={`option-indicator ${multiple ? "checkbox" : ""}`}
                      >
                        {selected && <Check size={13} />}
                      </span>
                      <span className="option-letter">
                        {option.option.toUpperCase()}
                      </span>
                      <span>{option.text}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <label className="numerical-field">
                <span>YOUR ANSWER</span>
                <input
                  inputMode="decimal"
                  value={answers[question.id] ?? ""}
                  disabled={Boolean(current)}
                  onChange={(event) =>
                    setAnswers((old) => ({
                      ...old,
                      [question.id]: event.target.value,
                    }))
                  }
                  placeholder="Enter a number"
                />
              </label>
            )}
            {current && (
              <output
                className={`answer-feedback ${current.isCorrect ? "is-correct" : "is-incorrect"}`}
                aria-live="polite"
              >
                <div className="feedback-heading">
                  {current.isCorrect ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <X size={16} />
                  )}
                  {current.isCorrect
                    ? "Correct — removed from mistakes"
                    : "Not quite — it stays on the list"}
                </div>
                <span className="eyebrow">CORRECT ANSWER</span>
                <p>
                  <span
                    className={`correct-answer-list ${current.correctAnswersFullText.length > 1 ? "multiple" : ""}`}
                  >
                    {current.correctAnswersFullText.map((text) => (
                      <span key={text}>{formatAnswer(text)}</span>
                    ))}
                  </span>
                </p>
                <Explanation
                  detail={current.explanationDetail}
                  raw={current.explanation}
                />
              </output>
            )}
          </article>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <div className="question-controls">
            {current ? (
              <button
                className="primary-button"
                onClick={() => setIndex(index + 1)}
                type="button"
              >
                {index < questions.length - 1 ? "Next question" : "See summary"}{" "}
                <ArrowRight size={15} />
              </button>
            ) : (
              <button
                className="primary-button"
                disabled={busy || !hasAnswer(answers[question.id])}
                onClick={check}
                type="button"
              >
                {busy ? "Checking answer..." : "Submit and check"}{" "}
                <CheckCircle2 size={15} />
              </button>
            )}
          </div>
        </>
      )}

      {finished && (
        <section className="fc-setup">
          <div className="fc-setup-main">
            <span className="eyebrow">SESSION COMPLETE</span>
            <h2 className="fc-done-title">
              {fixed} of {questions.length} fixed.
            </h2>
            <p className="fc-done-copy">
              {questions.length - fixed
                ? `${questions.length - fixed} still on the list for next time.`
                : "Your mistakes list is clear for this session."}
            </p>
            <div className="fc-setup-actions">
              <button
                className="primary-button"
                disabled={!pool.length}
                onClick={startSession}
                type="button"
              >
                <RotateCcw size={15} /> Go again
              </button>
              <button
                className="secondary-button"
                onClick={onHome}
                type="button"
              >
                Course home
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
