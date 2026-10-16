// Leitner-style spaced repetition for flashcards.
//
// Each reviewed card has an entry { box, due }. A miss drops the card to box 0
// (due immediately); each "got it" moves it up a box and schedules the next
// review further out. Cards without an entry are new.

const DAY_MS = 24 * 60 * 60 * 1000;
const intervalDays = [0, 1, 3, 7, 16, 35];
const maxBox = intervalDays.length - 1;
const masteredBox = 3;

export function rateCard(entry, status, now) {
  if (status !== "known") return { box: 0, due: now };
  const box = Math.min((entry?.box ?? 0) + 1, maxBox);
  return { box, due: now + intervalDays[box] * DAY_MS };
}

export function isDue(entry, now) {
  return !entry || entry.due <= now;
}

export function cardState(entry) {
  if (!entry) return "new";
  return entry.box >= masteredBox ? "mastered" : "learning";
}

// Older versions stored { [id]: "known" | "learning" }.
export function normalizeProgress(stored, now) {
  const progress = {};
  if (!stored || typeof stored !== "object") return progress;
  for (const [id, value] of Object.entries(stored)) {
    if (value === "known") {
      progress[id] = { box: 2, due: now + 3 * DAY_MS };
    } else if (value === "learning") {
      progress[id] = { box: 0, due: now };
    } else if (Number.isFinite(value?.box) && Number.isFinite(value?.due)) {
      progress[id] = { box: value.box, due: value.due };
    }
  }
  return progress;
}

// Most overdue first, then cards you have never seen.
export function byUrgency(progress) {
  return (left, right) => {
    const a = progress[left.id];
    const b = progress[right.id];
    if (a && b) return a.due - b.due;
    if (a) return -1;
    if (b) return 1;
    return left.week - right.week || left.number - right.number;
  };
}
