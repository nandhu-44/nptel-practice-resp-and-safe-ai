import lectureVideos from "../../resources/lecture_videos.json";

// Explanations in the answer key look like:
//   "AI Risk Part 3 [34:02-34:55] - We can look at the risk equation as ..."
//   "Bias - III [33:14-36:50] and Bias - IV [0:00-4:24] - Winogender ..."
//   "Slide 146 in the week's lecture notes lists ..."
// This turns them into structured pieces so the UI can link to the exact
// moment in the official NPTEL lecture video.

const normalize = (value) =>
  value
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const videoIdByLecture = new Map(
  Object.entries(lectureVideos).map(([name, id]) => [normalize(name), id]),
);

const timePattern = String.raw`\d+(?::\d+){1,2}`;
const sourcePattern = new RegExp(
  String.raw`^\s*(?:and\s+)?([^\[\]]*?)\s*\[(${timePattern})\s*[-–]\s*(${timePattern})\]`,
);

function toSeconds(label) {
  return label.split(":").reduce((total, part) => total * 60 + Number(part), 0);
}

function videoUrl(videoId, seconds) {
  const start = seconds ? `&t=${seconds}s` : "";
  return `https://www.youtube.com/watch?v=${videoId}${start}`;
}

export function parseExplanation(raw) {
  let rest = String(raw ?? "")
    .replace(/^\s*Explanation:\s*/i, "")
    .trim();
  const sources = [];

  for (;;) {
    const match = rest.match(sourcePattern);
    if (!match) break;
    const [whole, lecture, start, end] = match;
    const videoId = videoIdByLecture.get(normalize(lecture));
    sources.push({
      lecture: lecture.replace(/\s+/g, " ").trim(),
      start,
      end,
      videoId: videoId ?? null,
      startSeconds: toSeconds(start),
      endSeconds: toSeconds(end),
      url: videoId ? videoUrl(videoId, toSeconds(start)) : null,
    });
    rest = rest.slice(whole.length);
  }
  rest = rest.replace(/^\s*[-–—:]\s*/, "").trim();

  // A bare lecture name ("Data Privacy") is a pointer, not an explanation.
  const bareVideoId = videoIdByLecture.get(normalize(rest));
  if (!sources.length && bareVideoId) {
    sources.push({
      lecture: rest,
      start: null,
      end: null,
      videoId: bareVideoId,
      startSeconds: 0,
      endSeconds: null,
      url: videoUrl(bareVideoId, 0),
    });
    rest = "";
  }

  // "Week 9 Lec 45 Lecture Notes [Slide 5] - ..." -> keep the slide as a chip.
  const slideLead = rest.match(
    /^[^\[\]()]*?[[(]\s*Slide\s+\d+\s*[\])]\s*[-–:]?\s*/i,
  );
  const slideSource = slideLead?.[0] ?? "";
  const slides = [
    ...new Set(
      [...rest.matchAll(/\bSlide\s+(\d+)/gi)].map((match) => Number(match[1])),
    ),
  ];

  return { sources, slides, text: rest.slice(slideSource.length).trim() };
}
