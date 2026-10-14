"use client";

import confetti from "canvas-confetti";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  GraduationCap,
  House,
  RotateCcw,
  Shuffle,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

const storageKey = "nptel-quiz-progress";
const examScoreStorageKey = "nptel-exam-score";
const examHistoryStorageKey = "nptel-exam-history";

export default function QuizApp({ weeks }) {
  const [weekNumber, setWeekNumber] = useState(1);
  const [view, setView] = useState("home");
  const [questions, setQuestions] = useState([]);
  const [studyQuestions, setStudyQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [checkedResults, setCheckedResults] = useState({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [runMode, setRunMode] = useState("week");
  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [examType, setExamType] = useState("full");
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [shuffleWeeks, setShuffleWeeks] = useState(false);
  const [showExamAnswers, setShowExamAnswers] = useState(false);
  const [scores, setScores] = useState({});
  const [examScore, setExamScore] = useState(null);
  const [examHistory, setExamHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const week = weeks.find((item) => item.week === weekNumber);
  const question = questions[index];
  const questionFeedback = question ? checkedResults[question.id] : null;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setScores(JSON.parse(stored));
      const storedExamScore = localStorage.getItem(examScoreStorageKey);
      if (storedExamScore) setExamScore(JSON.parse(storedExamScore));
      const storedExamHistory = localStorage.getItem(examHistoryStorageKey);
      if (storedExamHistory) {
        const parsedHistory = JSON.parse(storedExamHistory);
        if (Array.isArray(parsedHistory)) {
          setExamHistory(
            parsedHistory.filter(
              (attempt) =>
                Array.isArray(attempt?.questions) &&
                Array.isArray(attempt?.result?.results),
            ),
          );
        }
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    if (view === "results" && runMode !== "week" && result?.passed) {
      confetti({
        particleCount: 100,
        spread: 65,
        origin: { y: 0.68 },
        colors: ["#c9f27a", "#f5b85c", "#f4f1e8", "#80d8b0"],
      });
    }
  }, [view, result, runMode]);

  useEffect(() => {
    if (!examDialogOpen) return undefined;
    function closeOnEscape(event) {
      if (event.key === "Escape") setExamDialogOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [examDialogOpen]);

  async function start(targetWeek = weekNumber) {
    const requestedWeek = Number(targetWeek);
    if (
      !Number.isInteger(requestedWeek) ||
      !weeks.some((item) => Number(item.week) === requestedWeek)
    ) {
      setError("That weekly assignment is not available.");
      setView("home");
      return;
    }
    setBusy(true);
    setError("");
    setAnswers({});
    setCheckedResults({});
    setResult(null);
    setIndex(0);
    setRunMode("week");
    setWeekNumber(requestedWeek);
    try {
      const response = await fetch(`/api/quiz/${requestedWeek}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setQuestions(data.questions);
      setView("quiz");
    } catch (issue) {
      setError(issue.message || "Unable to load this quiz.");
    } finally {
      setBusy(false);
    }
  }

  async function startStudy(targetWeek) {
    const requestedWeek = Number(targetWeek);
    if (
      !Number.isInteger(requestedWeek) ||
      !weeks.some((item) => Number(item.week) === requestedWeek)
    ) {
      setError("That weekly assignment is not available.");
      setView("home");
      return;
    }

    setBusy(true);
    setError("");
    setWeekNumber(requestedWeek);
    setRunMode("week");
    try {
      const response = await fetch(`/api/quiz/${requestedWeek}?mode=study`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setStudyQuestions(data.questions);
      setView("study");
    } catch (issue) {
      setError(issue.message || "Unable to load study answers.");
      setView("home");
    } finally {
      setBusy(false);
    }
  }

  async function startExam() {
    setBusy(true);
    setError("");
    setExamDialogOpen(false);
    setAnswers({});
    setCheckedResults({});
    setResult(null);
    setIndex(0);
    try {
      const response = await fetch("/api/quiz/exam");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      let examQuestions = data.questions;
      const mode = examType;
      const mixWeeks = mode === "random50" || shuffleWeeks;
      if (mode === "random50") {
        examQuestions = shuffleList(examQuestions).slice(0, 50);
      }
      if (mixWeeks) examQuestions = shuffleList(examQuestions);
      else
        examQuestions.sort(
          (left, right) => left.week - right.week || left.number - right.number,
        );
      if (shuffleOptions) {
        examQuestions = examQuestions.map((item) => ({
          ...item,
          options: item.options
            ? shuffleList(item.options).map((option, index) => ({
                ...option,
                sourceOption: option.option,
                option: String.fromCharCode(97 + index),
              }))
            : null,
        }));
      }
      setQuestions(examQuestions);
      setRunMode(mode);
      setView("quiz");
    } catch (issue) {
      setError(issue.message || "Unable to load the exam.");
    } finally {
      setBusy(false);
    }
  }

  async function checkAnswer() {
    if (!question || answers[question.id] === undefined || questionFeedback)
      return;
    if (runMode !== "week" && !showExamAnswers) {
      setCheckedResults((old) => ({
        ...old,
        [question.id]: { submitted: true },
      }));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const isExam = runMode !== "week";
      const response = await fetch(
        isExam ? "/api/quiz/exam" : `/api/quiz/${weekNumber}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: question.id,
            answer: answers[question.id],
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCheckedResults((old) => ({ ...old, [question.id]: data }));
    } catch (issue) {
      setError(issue.message || "Unable to check this answer.");
    } finally {
      setBusy(false);
    }
  }

  async function finishQuiz() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        runMode === "week" ? `/api/quiz/${weekNumber}` : "/api/quiz/exam",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            runMode === "week"
              ? { answers }
              : { questionIds: questions.map((item) => item.id), answers },
          ),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data);
      if (runMode === "week") {
        setScores((old) => {
          const next = { ...old, [weekNumber]: data.percentage };
          localStorage.setItem(storageKey, JSON.stringify(next));
          return next;
        });
      } else {
        const latestExamScore = {
          percentage: data.percentage,
          score: data.score,
          total: data.total,
          mode: runMode,
        };
        const attempt = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          completedAt: new Date().toISOString(),
          ...latestExamScore,
          questions: questions.map(({ id, options }) => ({ id, options })),
          result: data,
        };
        const updatedExamHistory = [attempt, ...examHistory];
        setExamHistory(updatedExamHistory);
        setExamScore(latestExamScore);
        try {
          localStorage.setItem(
            examScoreStorageKey,
            JSON.stringify(latestExamScore),
          );
          localStorage.setItem(
            examHistoryStorageKey,
            JSON.stringify(updatedExamHistory),
          );
        } catch {
          setError("This attempt could not be saved in browser storage.");
        }
      }
      setView("results");
    } catch (issue) {
      setError(issue.message || "Unable to finish this quiz.");
    } finally {
      setBusy(false);
    }
  }

  function openExamReview(attempt) {
    setQuestions(attempt.questions);
    setResult(attempt.result);
    setRunMode(attempt.mode);
    setIndex(0);
    setAnswers({});
    setCheckedResults({});
    setError("");
    setView("results");
  }

  function chooseWeek(number) {
    const requestedWeek = Number(number);
    if (
      !Number.isInteger(requestedWeek) ||
      !weeks.some((item) => Number(item.week) === requestedWeek)
    ) {
      setError("That weekly assignment is not available.");
      setView("home");
      return;
    }
    setWeekNumber(requestedWeek);
    setView("overview");
    setRunMode("week");
    setResult(null);
    setError("");
  }
  function goHome() {
    setView("home");
    setRunMode("week");
    setResult(null);
    setError("");
  }
  function answer(id, value, multiple) {
    if (checkedResults[id]) return;
    setAnswers((old) => {
      if (!multiple) return { ...old, [id]: value };
      const selected = old[id] ?? [];
      return {
        ...old,
        [id]: selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value],
      };
    });
  }

  const completed = Object.keys(scores).length;
  const average = completed
    ? Math.round(
        Object.values(scores).reduce((sum, score) => sum + score, 0) /
          completed,
      )
    : 0;
  const answered = Object.keys(checkedResults).length;

  return (
    <div className="app-shell">
      <header className="mobile-header">
        <Brand />
        <span>RESPONSIBLE &amp; SAFE AI SYSTEMS</span>
      </header>
      <aside className="sidebar">
        <div className="desktop-brand">
          <Brand />
        </div>
        <div className="sidebar-course">
          <span className="eyebrow">COURSE</span>
          <p>
            Responsible
            <br />
            &amp; Safe AI Systems
          </p>
          <span>WEEKS 01—11</span>
        </div>
        <button
          className={`home-link ${view === "home" ? "is-active" : ""}`}
          onClick={goHome}
          type="button"
        >
          <House size={14} /> Course home
        </button>
        <nav className="week-navigation" aria-label="Quiz weeks">
          <span className="eyebrow week-nav-label">ASSIGNMENTS</span>
          {weeks.map((item) => (
            <button
              className={`week-link ${view !== "home" && weekNumber === item.week ? "is-active" : ""}`}
              key={item.week}
              onClick={() => chooseWeek(item.week)}
              type="button"
              aria-current={
                view !== "home" && weekNumber === item.week ? "page" : undefined
              }
            >
              <span className="week-number">
                {String(item.week).padStart(2, "0")}
              </span>
              <span className="week-link-title">{item.title}</span>
              {scores[item.week] !== undefined && (
                <span className="week-score">{scores[item.week]}%</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <i className="status-dot" /> Local quiz set <span>131 Q</span>
        </div>
      </aside>
      <main className="main-panel">
        <div className="topbar">
          <div>
            RESPONSIBLE &amp; SAFE AI SYSTEMS <span>/</span>{" "}
            {view === "home"
              ? "COURSE HOME"
              : runMode === "week"
                ? `WEEK ${String(weekNumber).padStart(2, "0")}`
                : runMode === "random50"
                  ? "RANDOM 50 EXAM"
                  : "FULL EXAM"}
          </div>
          <span>
            <i className="status-dot" /> COURSE MATERIAL
          </span>
        </div>
        <section className="workspace page-enter" key={`${weekNumber}-${view}`}>
          {view === "home" && (
            <>
              <div className="section-kicker">NPTEL COURSE · 11 WEEKS</div>
              <div className="home-heading">
                <div>
                  <span className="eyebrow">QUIZ PRACTICE</span>
                  <h1>Responsible &amp; Safe AI Systems</h1>
                  <p>
                    Work through weekly assignments or take a full course exam.
                    Choose whether exam answers appear after each question or in
                    the final review.
                  </p>
                </div>
                <div className="home-progress">
                  <span className="eyebrow">ASSIGNMENTS COMPLETED</span>
                  <strong>
                    {String(completed).padStart(2, "0")}
                    <small> / {weeks.length}</small>
                  </strong>
                  <div className="score-meter">
                    <i
                      style={{ width: `${(completed / weeks.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              {error && (
                <p className="error-message" role="alert">
                  {error}
                </p>
              )}
              <section className="home-exam">
                <div>
                  <span className="eyebrow">FULL COURSE · WEEKS 01—11</span>
                  <h2>Take an exam</h2>
                  <p>
                    Choose the full 131-question exam or a random set of 50.
                  </p>
                </div>
                <div className="home-exam-actions">
                  {examScore && (
                    <div className="home-exam-score">
                      <span className="eyebrow">LAST EXAM SCORE</span>
                      <strong>{examScore.percentage}%</strong>
                      <small>
                        {examScore.score}/{examScore.total} correct
                      </small>
                    </div>
                  )}
                  <button
                    className="primary-button"
                    disabled={busy}
                    onClick={() => setExamDialogOpen(true)}
                    type="button"
                  >
                    <Shuffle size={15} /> Take exam <ArrowRight size={15} />
                  </button>
                </div>
              </section>
              {examHistory.length > 0 && (
                <section
                  className="exam-history"
                  aria-labelledby="exam-history-title"
                >
                  <div className="exam-history-heading">
                    <div>
                      <span className="eyebrow">EXAM ARCHIVE</span>
                      <h2 id="exam-history-title">Past exams</h2>
                    </div>
                    <span>{examHistory.length} ATTEMPTS</span>
                  </div>
                  <div className="exam-history-list">
                    {examHistory.map((attempt) => (
                      <article className="exam-history-row" key={attempt.id}>
                        <div className="exam-history-info">
                          <strong>
                            {attempt.mode === "random50"
                              ? "Random 50"
                              : "Full exam"}
                          </strong>
                          <span>
                            {new Date(attempt.completedAt).toLocaleString()}
                          </span>
                        </div>
                        <span
                          className={`exam-history-outcome ${attempt.result.passed ? "passed" : "failed"}`}
                        >
                          {attempt.result.passed ? "PASSED" : "NOT PASSED"}
                        </span>
                        <span className="exam-history-score">
                          {attempt.percentage}%
                          <small>
                            {attempt.score}/{attempt.total} correct
                          </small>
                        </span>
                        <button
                          className="exam-history-review"
                          onClick={() => openExamReview(attempt)}
                          type="button"
                        >
                          <BookOpen size={14} /> Review
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )}
              <div className="home-assignment-heading">
                <div>
                  <span className="eyebrow">11 WEEKLY ASSIGNMENTS</span>
                  <h2>Choose a week</h2>
                </div>
                <span className="eyebrow">{completed} COMPLETED</span>
              </div>
              <div className="assignment-grid">
                {weeks.map((item) => (
                  <article className="assignment-tile" key={item.week}>
                    <div className="assignment-tile-top">
                      <span className="week-display">
                        WEEK <b>{String(item.week).padStart(2, "0")}</b>
                      </span>
                      {scores[item.week] !== undefined && (
                        <span className="week-score">{scores[item.week]}%</span>
                      )}
                    </div>
                    <h3>{item.title}</h3>
                    <span className="assignment-question-count">
                      {item.totalQuestions} QUESTIONS
                    </span>
                    <div className="assignment-actions">
                      <button
                        className="assignment-action"
                        disabled={busy}
                        onClick={() => start(item.week)}
                        type="button"
                      >
                        Take assignment <ArrowRight size={14} />
                      </button>
                      <button
                        className="assignment-action study-action"
                        disabled={busy}
                        onClick={() => startStudy(item.week)}
                        type="button"
                      >
                        Study answers <BookOpen size={14} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          {view === "study" && week && (
            <>
              <button className="back-link" onClick={goHome} type="button">
                <ArrowLeft size={14} /> COURSE HOME
              </button>
              <div className="study-heading">
                <div>
                  <span className="eyebrow">
                    WEEK {String(weekNumber).padStart(2, "0")} · QUICK REVISION
                  </span>
                  <h1>{week.title}</h1>
                  <p>
                    Questions, correct answers, and explanations for this week.
                  </p>
                </div>
                <span className="study-count">
                  {studyQuestions.length} QUESTIONS
                </span>
              </div>
              {error && (
                <p className="error-message" role="alert">
                  {error}
                </p>
              )}
              <div className="study-list">
                {studyQuestions.map((item) => (
                  <article className="study-item" key={item.id}>
                    <div className="study-item-meta">
                      Q{String(item.number).padStart(2, "0")}{" "}
                      <span>{item.type}</span>
                    </div>
                    <h2>{item.question}</h2>
                    {item.options?.length > 0 && (
                      <ul className="study-options">
                        {item.options.map((option) => (
                          <li
                            className={
                              item.correctAnswers.includes(option.option)
                                ? "is-correct"
                                : ""
                            }
                            key={option.option}
                          >
                            <span>{option.option.toUpperCase()}</span>
                            {option.text}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="study-answer">
                      <span className="eyebrow">CORRECT ANSWER</span>
                      <p>
                        <CorrectAnswers
                          answers={item.correctAnswersFullText}
                          multiple={item.type === "MSQ"}
                        />
                      </p>
                    </div>
                    {item.explanation !== "Explanation:" && (
                      <p className="explanation">{item.explanation}</p>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}
          {view === "overview" && week && (
            <>
              <div className="section-kicker">— &nbsp; WEEKLY ASSIGNMENT</div>
              <div className="overview-heading">
                <div>
                  <span className="week-display">
                    WEEK <b>{String(weekNumber).padStart(2, "0")}</b>
                  </span>
                  <h1>{week.title}</h1>
                </div>
                <span className="week-index">
                  {String(weekNumber).padStart(2, "0")} <i /> {weeks.length}
                </span>
              </div>
              <div className="overview-rule" />
              <div className="overview-lower">
                <div>
                  <p className="overview-intro">
                    Responsible
                    <br />
                    &amp; Safe AI Systems
                  </p>
                  <p className="overview-description">
                    {week.totalQuestions} questions covering this week&apos;s
                    course material. Your answers are checked when you submit.
                  </p>
                  <div className="overview-meta">
                    {week.totalQuestions} QUESTIONS <span>·</span> MCQ, MSQ
                    &amp; NUMERICAL
                  </div>
                  {error && (
                    <p className="error-message" role="alert">
                      {error}
                    </p>
                  )}
                  <button
                    className="primary-button start-button"
                    disabled={busy}
                    onClick={() => start()}
                    type="button"
                  >
                    {busy
                      ? "Loading quiz..."
                      : scores[weekNumber] !== undefined
                        ? "Retake assignment"
                        : "Begin assignment"}
                    {busy ? (
                      <span className="spinner" />
                    ) : (
                      <ArrowUpRight size={16} />
                    )}
                  </button>
                </div>
                <div className="overview-stats">
                  <div>
                    <span className="eyebrow">WEEKS COMPLETED</span>
                    <strong>
                      {String(completed).padStart(2, "0")}
                      <small> / {weeks.length}</small>
                    </strong>
                  </div>
                  <div>
                    <span className="eyebrow">AVERAGE SCORE</span>
                    <strong>
                      {String(average).padStart(2, "0")}
                      <small>%</small>
                    </strong>
                  </div>
                  <div className="current-score">
                    <span className="eyebrow">
                      WEEK {String(weekNumber).padStart(2, "0")} SCORE
                    </span>
                    <span>
                      {scores[weekNumber] === undefined
                        ? "NOT STARTED"
                        : `${scores[weekNumber]}%`}
                    </span>
                  </div>
                  <div className="score-meter">
                    <i style={{ width: `${scores[weekNumber] ?? 0}%` }} />
                  </div>
                </div>
              </div>
            </>
          )}
          {view === "quiz" && question && (
            <>
              <button
                className="back-link"
                onClick={() => {
                  setView("overview");
                  setRunMode("week");
                }}
                type="button"
              >
                <ArrowLeft size={14} />{" "}
                {runMode === "week" ? "ASSIGNMENT OVERVIEW" : "EXAM SETUP"}
              </button>
              <div className="quiz-heading">
                <div>
                  <span className="eyebrow">
                    {runMode === "week" ? "QUESTION" : "EXAM QUESTION"}{" "}
                    {String(index + 1).padStart(2, "0")}{" "}
                    <span>/ {questions.length}</span>
                  </span>
                  <h1>
                    {runMode === "week"
                      ? "Weekly assignment"
                      : runMode === "random50"
                        ? "Random 50 exam"
                        : "Full exam"}
                  </h1>
                </div>
                <span className="eyebrow">
                  {String(answered).padStart(2, "0")} ANSWERED
                </span>
              </div>
              {runMode !== "week" && (
                <div className="exam-pass-note">
                  EXAM PASS MARK <b>MORE THAN 50%</b>
                </div>
              )}
              <div
                className="question-progress"
                style={{
                  gridTemplateColumns: `repeat(${questions.length}, minmax(0, 1fr))`,
                }}
              >
                {questions.map((item, i) => (
                  <button
                    key={item.id}
                    className={`progress-step ${i === index ? "is-current" : ""} ${checkedResults[item.id] ? "is-answered" : ""}`}
                    onClick={() => setIndex(i)}
                    type="button"
                    disabled={!checkedResults[item.id] || i === index}
                    aria-label={`Go to question ${i + 1}`}
                    aria-current={i === index ? "step" : undefined}
                  />
                ))}
              </div>
              <article className="question-frame">
                <div className="question-meta">
                  {runMode !== "week" &&
                    `WEEK ${String(question.week).padStart(2, "0")} · `}
                  Q{String(question.number).padStart(2, "0")}{" "}
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
                      const answerValue = option.sourceOption ?? option.option;
                      const selected = multiple
                        ? (answers[question.id] ?? []).includes(answerValue)
                        : answers[question.id] === answerValue;
                      return (
                        <button
                          key={option.option}
                          className={`answer-option ${selected ? "is-selected" : ""}`}
                          onClick={() =>
                            answer(question.id, answerValue, multiple)
                          }
                          type="button"
                          disabled={Boolean(questionFeedback)}
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
                      disabled={Boolean(questionFeedback)}
                      onChange={(event) =>
                        answer(question.id, event.target.value, false)
                      }
                      placeholder="Enter a number"
                    />
                  </label>
                )}
                {questionFeedback &&
                  (runMode === "week" || showExamAnswers) && (
                    <output
                      className={`answer-feedback ${questionFeedback.isCorrect ? "is-correct" : "is-incorrect"}`}
                      aria-live="polite"
                    >
                      <div className="feedback-heading">
                        {questionFeedback.isCorrect ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <X size={16} />
                        )}
                        {questionFeedback.isCorrect ? "Correct" : "Not quite"}
                      </div>
                      <span className="eyebrow">CORRECT ANSWER</span>
                      <p>
                        <CorrectAnswers
                          answers={getCorrectAnswerTexts(
                            question,
                            questionFeedback,
                          )}
                          multiple={question.type === "MSQ"}
                        />
                      </p>
                      {questionFeedback.explanation !== "Explanation:" && (
                        <p className="explanation">
                          {questionFeedback.explanation}
                        </p>
                      )}
                    </output>
                  )}
              </article>
              {error && (
                <p className="error-message" role="alert">
                  {error}
                </p>
              )}
              <div className="question-controls">
                <button
                  className="secondary-button"
                  disabled={index === 0}
                  onClick={() => setIndex(index - 1)}
                  type="button"
                >
                  <ArrowLeft size={15} /> Previous
                </button>
                {!questionFeedback ? (
                  <button
                    className="primary-button"
                    disabled={busy || !hasAnswer(answers[question.id])}
                    onClick={checkAnswer}
                    type="button"
                  >
                    {busy
                      ? "Checking answer..."
                      : runMode !== "week" && !showExamAnswers
                        ? "Submit answer"
                        : "Submit and check"}{" "}
                    <CheckCircle2 size={15} />
                  </button>
                ) : index < questions.length - 1 ? (
                  <button
                    className="primary-button"
                    onClick={() => setIndex(index + 1)}
                    type="button"
                  >
                    Next question <ArrowRight size={15} />
                  </button>
                ) : (
                  <button
                    className="primary-button"
                    disabled={busy}
                    onClick={finishQuiz}
                    type="button"
                  >
                    {busy ? "Calculating score..." : "View final score"}{" "}
                    <CheckCircle2 size={15} />
                  </button>
                )}
              </div>
            </>
          )}
          {view === "results" && result && (
            <>
              <div className="section-kicker">
                — &nbsp;{" "}
                {runMode === "week" ? "ASSIGNMENT RESULTS" : "EXAM RESULTS"}
              </div>
              {runMode !== "week" && (
                <div className="exam-pass-note">
                  EXAM PASS MARK <b>MORE THAN 50%</b>
                </div>
              )}
              <div
                className={`result-banner ${runMode !== "week" ? (result.passed ? "passed" : "failed") : ""}`}
              >
                <div className="result-icon">
                  {runMode === "week" ? (
                    <CheckCircle2 size={19} />
                  ) : result.passed ? (
                    <Check size={21} />
                  ) : (
                    <X size={21} />
                  )}
                </div>
                <div>
                  <span className="eyebrow">
                    {runMode === "week"
                      ? `WEEK ${String(weekNumber).padStart(2, "0")} COMPLETE`
                      : "EXAM COMPLETE"}
                  </span>
                  <h1>
                    {runMode !== "week" && result.passed
                      ? "Congratulations, you passed."
                      : runMode === "week"
                        ? "Assignment complete."
                        : "Exam complete."}
                  </h1>
                  <p>
                    {runMode !== "week" && result.passed
                      ? "A strong result. Keep the momentum going."
                      : "Review your answers and explanations below."}
                  </p>
                </div>
                <strong
                  className={`result-score ${runMode === "week" ? "neutral-score" : ""}`}
                >
                  {result.percentage}
                  <small>%</small>
                </strong>
              </div>
              <div className="result-summary">
                <span>
                  <CheckCircle2 size={15} /> {result.score} CORRECT
                </span>
                <span>
                  <X size={15} /> {result.total - result.score} INCORRECT
                </span>
                <span>{result.total} QUESTIONS</span>
              </div>
              <div className="results-actions">
                <button
                  className="secondary-button"
                  onClick={() => {
                    setView("overview");
                    setRunMode("week");
                  }}
                  type="button"
                >
                  <ArrowLeft size={14} /> Week overview
                </button>
                <button
                  className="primary-button"
                  onClick={() =>
                    runMode === "week" ? start() : setExamDialogOpen(true)
                  }
                  type="button"
                >
                  <RotateCcw size={14} /> Retake{" "}
                  {runMode === "week" ? "quiz" : "exam"}
                </button>
              </div>
              <div className="review-heading">
                <div>
                  <span className="eyebrow">ANSWER REVIEW</span>
                  <h2>Question by question</h2>
                </div>
                <span>{result.total} ITEMS</span>
              </div>
              <div className="review-list">
                {result.results.map((item, i) => (
                  <article
                    className={`review-item ${item.isCorrect ? "correct" : "incorrect"}`}
                    key={item.id}
                  >
                    <span className="review-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <div className="review-status">
                        {item.isCorrect ? (
                          <CheckCircle2 size={13} />
                        ) : (
                          <X size={13} />
                        )}
                        {item.isCorrect ? "CORRECT" : "INCORRECT"}
                      </div>
                      {runMode !== "week" && (
                        <span className="eyebrow review-week">
                          WEEK {String(item.week).padStart(2, "0")}
                        </span>
                      )}
                      <h3>{item.question}</h3>
                      <span className="eyebrow">CORRECT ANSWER</span>
                      <p>
                        <CorrectAnswers
                          answers={getCorrectAnswerTexts(
                            questions.find(
                              (question) => question.id === item.id,
                            ),
                            item,
                          )}
                          multiple={item.type === "MSQ"}
                        />
                      </p>
                      {item.explanation !== "Explanation:" && (
                        <p className="explanation">{item.explanation}</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
        {examDialogOpen && (
          <div className="modal-backdrop">
            <section
              className="exam-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="exam-modal-title"
            >
              <div className="exam-modal-header">
                <div>
                  <span className="eyebrow">
                    RESPONSIBLE &amp; SAFE AI SYSTEMS
                  </span>
                  <h2 id="exam-modal-title">Set up your exam</h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="Close exam setup"
                  onClick={() => setExamDialogOpen(false)}
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>
              <div
                className="exam-tabs"
                role="tablist"
                aria-label="Exam length"
              >
                <button
                  className={examType === "full" ? "is-active" : ""}
                  onClick={() => {
                    setExamType("full");
                    setShuffleWeeks(false);
                  }}
                  role="tab"
                  aria-selected={examType === "full"}
                  type="button"
                >
                  Full exam <span>131 questions</span>
                </button>
                <button
                  className={examType === "random50" ? "is-active" : ""}
                  onClick={() => {
                    setExamType("random50");
                    setShuffleWeeks(true);
                  }}
                  role="tab"
                  aria-selected={examType === "random50"}
                  type="button"
                >
                  Random 50 <span>50 questions</span>
                </button>
              </div>
              <div className="exam-settings">
                <label className="setting-row">
                  <span>
                    <b>Shuffle answer options</b>
                    <small>Mix the choices within each question</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(event) =>
                      setShuffleOptions(event.target.checked)
                    }
                  />
                </label>
                <label className="setting-row">
                  <span>
                    <b>Shuffle questions across weeks</b>
                    <small>
                      {examType === "random50"
                        ? "Required for the random 50-question exam"
                        : "Mix questions from all course weeks"}
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    checked={examType === "random50" || shuffleWeeks}
                    disabled={examType === "random50"}
                    onChange={(event) => setShuffleWeeks(event.target.checked)}
                  />
                </label>
                <label className="setting-row">
                  <span>
                    <b>Show answers after each question</b>
                    <small>
                      Otherwise, answers and explanations appear in the final
                      review
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    checked={showExamAnswers}
                    onChange={(event) =>
                      setShowExamAnswers(event.target.checked)
                    }
                  />
                </label>
              </div>
              <div className="exam-modal-footer">
                <span>
                  PASS MARK <b>MORE THAN 50%</b>
                </span>
                <button
                  className="primary-button"
                  disabled={busy}
                  onClick={startExam}
                  type="button"
                >
                  {busy ? "Preparing..." : "Start exam"}
                  <ArrowRight size={15} />
                </button>
              </div>
            </section>
          </div>
        )}
        <footer className="page-footer">
          <span>NPTEL · RESPONSIBLE &amp; SAFE AI SYSTEMS</span>
          <span>
            {view === "home"
              ? `${weeks.length} WEEKS / 131 QUESTIONS`
              : runMode === "week"
                ? `WEEK ${String(weekNumber).padStart(2, "0")} / ${week?.totalQuestions ?? 0} QUESTIONS`
                : `${questions.length} QUESTION EXAM`}
          </span>
        </footer>
      </main>
    </div>
  );
}

function Brand() {
  return (
    <a className="brand" href="#home">
      <span className="brand-mark">
        <GraduationCap size={16} />
      </span>
      <span>
        NPTEL <i>/</i> SAFE AI
      </span>
    </a>
  );
}

function hasAnswer(value) {
  return Array.isArray(value)
    ? value.length > 0
    : String(value ?? "").trim().length > 0;
}

function formatCorrectAnswer(answer) {
  return answer.replace(/^([a-z])\.\s*/i, "($1) ");
}

function getCorrectAnswerTexts(question, result) {
  if (!question?.options?.some((option) => option.sourceOption)) {
    return result.correctAnswersFullText;
  }

  const correctOptions = new Set(result.correctAnswers);
  return question.options
    .filter((option) => correctOptions.has(option.sourceOption))
    .map((option) => `${option.option}. ${option.text}`);
}

function CorrectAnswers({ answers, multiple }) {
  if (multiple) {
    return (
      <span className="correct-answer-list multiple">
        {answers.map((answer) => (
          <span key={answer}>{formatCorrectAnswer(answer)}</span>
        ))}
      </span>
    );
  }

  return answers.map(formatCorrectAnswer).join(" · ");
}

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
