// Questions answered wrong, kept until they are answered correctly.
// Stored as { [questionId]: lastMissedAtMs }. Recording is idempotent, so the
// same result can be applied twice (per-question check, then final grading).

export const mistakesStorageKey = "nptel-mistakes";

export function loadMistakes() {
  try {
    const stored = JSON.parse(localStorage.getItem(mistakesStorageKey) ?? "{}");
    return stored && typeof stored === "object" && !Array.isArray(stored)
      ? stored
      : {};
  } catch {
    return {};
  }
}

function saveMistakes(mistakes) {
  try {
    localStorage.setItem(mistakesStorageKey, JSON.stringify(mistakes));
  } catch {
    // Storage can be unavailable (private mode); mistakes stay in memory.
  }
}

function hasSubmission(submitted) {
  return Array.isArray(submitted)
    ? submitted.length > 0
    : String(submitted ?? "").trim() !== "";
}

// Unanswered questions in a graded set are ignored; only a real attempt counts.
export function applyResults(mistakes, results, now = Date.now()) {
  const next = { ...mistakes };
  for (const { id, isCorrect, submitted } of results) {
    if (isCorrect) delete next[id];
    else if (hasSubmission(submitted)) next[id] = now;
  }
  return next;
}

export function recordResults(mistakes, results) {
  const next = applyResults(mistakes, results);
  saveMistakes(next);
  return next;
}
