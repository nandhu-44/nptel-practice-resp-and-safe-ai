"use client";

import confetti from "canvas-confetti";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  House,
  Layers,
  Moon,
  RotateCcw,
  Search as SearchIcon,
  Shuffle,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import Explanation from "../components/explanation";
import Mistakes from "../components/mistakes";
import Search from "../components/search";
import { loadMistakes, recordResults } from "../lib/mistakes";
import Flashcards from "./flashcards";

const storageKey = "nptel-quiz-progress";
const examScoreStorageKey = "nptel-exam-score";
const examHistoryStorageKey = "nptel-exam-history";
const themeStorageKey = "nptel-theme";
const maxExamHistory = 20;
const showExamAnswerSetting = false;
// Views that are not tied to a specific week in the sidebar.
const toolViews = ["home", "flashcards", "mistakes", "search"];
// The phone week rail stays open on these; elsewhere it tucks into a handle.
const railDockedViews = ["home", "overview"];
const toolViewLabels = {
  home: "COURSE HOME",
  flashcards: "FLASHCARDS",
  mistakes: "MISTAKES",
  search: "SEARCH",
};
const pad = (value) => String(value).padStart(2, "0");

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
  const [mistakes, setMistakes] = useState({});
  const [railPeek, setRailPeek] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const week = weeks.find((item) => item.week === weekNumber);
  const question = questions[index];
  const questionFeedback = question ? checkedResults[question.id] : null;

  useEffect(() => {
    setTheme(
      document.documentElement.dataset.theme === "light" ? "light" : "dark",
    );
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(themeStorageKey, next);
    } catch {
      // Theme still applies for this session.
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: collapse the rail whenever the view changes
  useEffect(() => {
    setRailPeek(false);
  }, [view, weekNumber]);

  useEffect(() => {
    setMistakes(loadMistakes());
  }, []);

  // "/" jumps to search, unless you are typing somewhere.
  useEffect(() => {
    function onKey(event) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey)
        return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      )
        return;
      event.preventDefault();
      setView("search");
      setRunMode("week");
      setResult(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
        colors: ["#c4578f", "#e8a15b", "#faf9f7", "#7fcf9f"],
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
    if (runMode !== "week" && !showExamAnswers) return;
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
      trackMistakes([data]);
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
      trackMistakes(data.results);
      if (runMode === "week") {
        const nextScores = { ...scores, [weekNumber]: data.percentage };
        setScores(nextScores);
        try {
          localStorage.setItem(storageKey, JSON.stringify(nextScores));
        } catch {
          setError("This score could not be saved in browser storage.");
        }
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
          questions: questions.map(({ id, number, options }) => ({
            id,
            number,
            options,
          })),
          result: data,
        };
        const updatedExamHistory = [attempt, ...examHistory].slice(
          0,
          maxExamHistory,
        );
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
  function trackMistakes(results) {
    setMistakes((old) => recordResults(old, results));
  }
  function openMistakes() {
    setView("mistakes");
    setRunMode("week");
    setResult(null);
    setError("");
  }
  function openSearch() {
    setView("search");
    setRunMode("week");
    setResult(null);
    setError("");
  }
  function openFlashcards() {
    setView("flashcards");
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
  const mistakeCount = Object.keys(mistakes).length;
  const totalQuestions = weeks.reduce(
    (sum, item) => sum + item.totalQuestions,
    0,
  );

  return (
    <div
      className={`app-shell ${railDockedViews.includes(view) ? "rail-docked" : ""}`}
    >
      <header className="mobile-header">
        <Brand onClick={goHome} />
        <span className="mobile-header-title">
          RESPONSIBLE &amp; SAFE AI SYSTEMS
        </span>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          type="button"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </header>
      <aside className="sidebar">
        <div className="desktop-brand">
          <Brand onClick={goHome} />
        </div>
        <div className="sidebar-course">
          <span className="eyebrow">COURSE</span>
          <p>
            Responsible
            <br />
            &amp; Safe AI Systems
          </p>
          <span>WEEKS 01—{pad(weeks.length)}</span>
        </div>
        <button
          className={`home-link ${view === "home" ? "is-active" : ""}`}
          onClick={goHome}
          type="button"
        >
          <House size={14} /> Course home
        </button>
        <button
          className={`home-link ${view === "flashcards" ? "is-active" : ""}`}
          onClick={openFlashcards}
          type="button"
        >
          <Layers size={14} /> Flashcards
        </button>
        <button
          className={`home-link ${view === "mistakes" ? "is-active" : ""}`}
          onClick={openMistakes}
          type="button"
        >
          <RotateCcw size={14} /> Mistakes
          {mistakeCount > 0 && <b className="nav-badge">{mistakeCount}</b>}
        </button>
        <button
          className={`home-link ${view === "search" ? "is-active" : ""}`}
          onClick={openSearch}
          type="button"
        >
          <SearchIcon size={14} /> Search
        </button>
        <nav className="week-navigation" aria-label="Quiz weeks">
          <span className="eyebrow week-nav-label">ASSIGNMENTS</span>
          {weeks.map((item) => (
            <button
              className={`week-link ${!toolViews.includes(view) && weekNumber === item.week ? "is-active" : ""}`}
              key={item.week}
              onClick={() => chooseWeek(item.week)}
              type="button"
              aria-current={
                !toolViews.includes(view) && weekNumber === item.week
                  ? "page"
                  : undefined
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
      </aside>
      {!railDockedViews.includes(view) && !railPeek && (
        <button
          aria-label="Show assignment numbers"
          className="mobile-rail-handle"
          onClick={() => setRailPeek(true)}
          type="button"
        >
          <ChevronLeft size={16} />
        </button>
      )}
      {!railDockedViews.includes(view) && railPeek && (
        <button
          aria-label="Hide assignment numbers"
          className="mobile-rail-scrim"
          onClick={() => setRailPeek(false)}
          type="button"
        />
      )}
      {(railDockedViews.includes(view) || railPeek) && (
        <nav aria-label="Assignments" className="mobile-rail">
          <span aria-hidden="true" className="mobile-rail-label">
            WK
          </span>
          {weeks.map((item) => {
            const active =
              !toolViews.includes(view) && weekNumber === item.week;
            return (
              <button
                aria-current={active ? "page" : undefined}
                aria-label={`Week ${item.week}: ${item.title}`}
                className={`mobile-rail-week ${active ? "is-active" : ""} ${scores[item.week] !== undefined ? "is-done" : ""}`}
                key={item.week}
                onClick={() => chooseWeek(item.week)}
                type="button"
              >
                {pad(item.week)}
              </button>
            );
          })}
        </nav>
      )}
      <nav aria-label="Primary" className="mobile-tabbar">
        {[
          ["home", "Home", House, goHome],
          ["flashcards", "Cards", Layers, openFlashcards],
          ["mistakes", "Mistakes", RotateCcw, openMistakes],
          ["search", "Search", SearchIcon, openSearch],
        ].map(([id, label, Icon, action]) => (
          <button
            aria-current={view === id ? "page" : undefined}
            className={view === id ? "is-active" : ""}
            key={id}
            onClick={action}
            type="button"
          >
            <Icon size={18} />
            {label}
            {id === "mistakes" && mistakeCount > 0 && (
              <b className="nav-badge">{mistakeCount}</b>
            )}
          </button>
        ))}
      </nav>
      <main className="main-panel">
        <div className="topbar">
          <div>
            RESPONSIBLE &amp; SAFE AI SYSTEMS <span>/</span>{" "}
            {toolViewLabels[view] ??
              (runMode === "week"
                ? `WEEK ${pad(weekNumber)}`
                : runMode === "random50"
                  ? "RANDOM 50 EXAM"
                  : "FULL EXAM")}
          </div>
          <span>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              type="button"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </span>
        </div>
        <section className="workspace page-enter" key={`${weekNumber}-${view}`}>
          {view === "home" && (
            <>
              <div className="section-kicker">
                NPTEL COURSE · {weeks.length} WEEKS
              </div>
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
                  <span className="eyebrow">
                    FULL COURSE · WEEKS 01—{pad(weeks.length)}
                  </span>
                  <h2>Take an exam</h2>
                  <p>
                    Choose the full {totalQuestions}-question exam or a random
                    set of 50.
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
              <section className="home-exam home-flashcards">
                <div>
                  <span className="eyebrow">ACTIVE RECALL</span>
                  <h2>Flashcards</h2>
                  <p>
                    Flip through every question as a card, track what you know,
                    and get judged by cats.
                  </p>
                </div>
                <div className="home-exam-actions">
                  <button
                    className="primary-button"
                    onClick={openFlashcards}
                    type="button"
                  >
                    <Layers size={15} /> Open flashcards{" "}
                    <ArrowRight size={15} />
                  </button>
                </div>
              </section>
              <section className="home-exam home-flashcards">
                <div>
                  <span className="eyebrow">TARGETED PRACTICE</span>
                  <h2>Mistakes</h2>
                  <p>
                    {mistakeCount
                      ? `${mistakeCount} question${mistakeCount === 1 ? "" : "s"} you got wrong, ready to retry. Get one right and it drops off the list.`
                      : "Questions you get wrong in assignments and exams collect here for a focused retry."}
                  </p>
                </div>
                <div className="home-exam-actions">
                  <button
                    className="primary-button"
                    onClick={openMistakes}
                    type="button"
                  >
                    <RotateCcw size={15} /> Practise mistakes{" "}
                    <ArrowRight size={15} />
                  </button>
                  <button
                    className="secondary-button"
                    onClick={openSearch}
                    type="button"
                  >
                    <SearchIcon size={14} /> Search
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
                  <span className="eyebrow">
                    {weeks.length} WEEKLY ASSIGNMENTS
                  </span>
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
          {view === "flashcards" && (
            <Flashcards weeks={weeks} onHome={goHome} />
          )}
          {view === "mistakes" && (
            <Mistakes
              mistakes={mistakes}
              onHome={goHome}
              onRecord={trackMistakes}
            />
          )}
          {view === "search" && <Search weeks={weeks} onHome={goHome} />}
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
                    <Explanation
                      detail={item.explanationDetail}
                      raw={item.explanation}
                    />
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
                  <div className="overview-actions">
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
                    <button
                      className="secondary-button start-button"
                      disabled={busy}
                      onClick={() => startStudy(weekNumber)}
                      type="button"
                    >
                      Study answers <BookOpen size={15} />
                    </button>
                  </div>
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
                  if (runMode === "week") {
                    setView("overview");
                  } else {
                    goHome();
                  }
                }}
                type="button"
              >
                <ArrowLeft size={14} />{" "}
                {runMode === "week" ? "ASSIGNMENT OVERVIEW" : "COURSE HOME"}
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
                <div className="quiz-heading-actions">
                  <span className="eyebrow">
                    {String(answered).padStart(2, "0")} ANSWERED
                  </span>
                  {runMode !== "week" && (
                    <button
                      className="primary-button quiz-submit-button"
                      disabled={busy}
                      onClick={finishQuiz}
                      type="button"
                    >
                      Submit exam <CheckCircle2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              {runMode !== "week" && (
                <div className="exam-pass-note">
                  EXAM PASS MARK <b>50% OR MORE</b>
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
                    className={`progress-step ${i === index ? "is-current" : ""} ${checkedResults[item.id] || (runMode !== "week" && !showExamAnswers && hasAnswer(answers[item.id])) ? "is-answered" : ""}`}
                    onClick={() => setIndex(i)}
                    type="button"
                    disabled={
                      ((runMode === "week" || showExamAnswers) &&
                        !checkedResults[item.id]) ||
                      i === index
                    }
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
                      <Explanation
                        detail={questionFeedback.explanationDetail}
                        raw={questionFeedback.explanation}
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
                <button
                  className="secondary-button"
                  disabled={index === 0}
                  onClick={() => setIndex(index - 1)}
                  type="button"
                >
                  <ArrowLeft size={15} /> Previous
                </button>
                {runMode !== "week" && !showExamAnswers ? (
                  <button
                    className="primary-button"
                    disabled={index === questions.length - 1}
                    onClick={() => setIndex(index + 1)}
                    type="button"
                  >
                    Next question <ArrowRight size={15} />
                  </button>
                ) : !questionFeedback ? (
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
                  EXAM PASS MARK <b>50% OR MORE</b>
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
                      ? "Noice"
                      : runMode === "week"
                        ? "Assignment complete."
                        : "Git Gud"}
                  </h1>
                  <p>
                    {runMode !== "week" && result.passed
                      ? "You reached the pass mark. Keep the momentum going."
                      : runMode !== "week"
                        ? "Below the pass mark. Review your answers and try again."
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
                    if (runMode === "week") {
                      setView("overview");
                    } else {
                      goHome();
                    }
                  }}
                  type="button"
                >
                  <ArrowLeft size={14} />{" "}
                  {runMode === "week" ? "Week overview" : "Course home"}
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
                {result.results.map((item, i) => {
                  const reviewQuestion = questions.find(
                    (question) => question.id === item.id,
                  );
                  const questionNumber =
                    reviewQuestion?.number ??
                    Number(item.id.match(/Q(\d+)$/)?.[1]);
                  return (
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
                            WEEK {String(item.week).padStart(2, "0")} · QUESTION{" "}
                            {String(questionNumber).padStart(2, "0")}
                          </span>
                        )}
                        <h3>{item.question}</h3>
                        {runMode !== "week" && (
                          <>
                            <span className="eyebrow">YOUR ANSWER</span>
                            <p
                              className={`review-user-answer ${item.isCorrect ? "is-correct" : "is-incorrect"}`}
                            >
                              <SubmittedAnswer
                                answers={getSubmittedAnswerTexts(
                                  reviewQuestion,
                                  item.submitted,
                                )}
                                multiple={item.type === "MSQ"}
                              />
                            </p>
                          </>
                        )}
                        <span className="eyebrow">CORRECT ANSWER</span>
                        <p>
                          <CorrectAnswers
                            answers={getCorrectAnswerTexts(
                              reviewQuestion,
                              item,
                            )}
                            multiple={item.type === "MSQ"}
                          />
                        </p>
                        <Explanation
                          detail={item.explanationDetail}
                          raw={item.explanation}
                        />
                      </div>
                    </article>
                  );
                })}
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
                  Full exam <span>{totalQuestions} questions</span>
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
                {showExamAnswerSetting && (
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
                )}
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
              ? `${weeks.length} WEEKS / ${totalQuestions} QUESTIONS`
              : runMode === "week"
                ? `WEEK ${String(weekNumber).padStart(2, "0")} / ${week?.totalQuestions ?? 0} QUESTIONS`
                : `${questions.length} QUESTION EXAM`}
          </span>
        </footer>
      </main>
    </div>
  );
}

function Brand({ onClick }) {
  return (
    <button className="brand" onClick={onClick} type="button">
      Safe AI Practice
    </button>
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

function getSubmittedAnswerTexts(question, submitted) {
  if (!hasAnswer(submitted)) return [];
  if (!question?.options?.length) return [String(submitted)];

  const selected = new Set(Array.isArray(submitted) ? submitted : [submitted]);
  return question.options
    .filter((option) => selected.has(option.sourceOption ?? option.option))
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

function SubmittedAnswer({ answers, multiple }) {
  if (!answers.length) return "Not answered.";

  return <CorrectAnswers answers={answers} multiple={multiple} />;
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
