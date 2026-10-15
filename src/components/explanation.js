"use client";

import { ArrowUpRight, FileText, Lightbulb, PlayCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const urlPattern = /(https?:\/\/[^\s)]+)/g;

function LinkedText({ text }) {
  return text.split(urlPattern).map((part, index) =>
    /^https?:\/\//.test(part) ? (
      <a
        className="explain-link"
        href={part}
        key={`${index}-${part}`}
        rel="noreferrer"
        target="_blank"
      >
        {part.replace(/^https?:\/\/(www\.)?/, "")}
      </a>
    ) : (
      part
    ),
  );
}

function embedUrl(source) {
  const params = new URLSearchParams({
    start: String(source.startSeconds ?? 0),
    autoplay: "1",
    rel: "0",
    modestbranding: "1",
  });
  if (source.endSeconds) params.set("end", String(source.endSeconds));
  return `https://www.youtube-nocookie.com/embed/${source.videoId}?${params}`;
}

function LecturePreview({ source, text, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const range = source.start ? `${source.start}–${source.end}` : "";

  return (
    <dialog
      className="lecture-preview"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      ref={dialogRef}
    >
      <div className="lecture-preview-panel">
        <header className="lecture-preview-header">
          <div>
            <span className="eyebrow">
              LECTURE CLIP{range && ` · ${range}`}
            </span>
            <h2>{source.lecture}</h2>
          </div>
          <button
            aria-label="Close preview"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </header>
        <div className="lecture-preview-video">
          <iframe
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            src={embedUrl(source)}
            title={`${source.lecture} ${range}`.trim()}
          />
        </div>
        {text && (
          <p className="lecture-preview-text">
            <LinkedText text={text} />
          </p>
        )}
        <a
          className="explain-link lecture-preview-youtube"
          href={source.url}
          rel="noreferrer"
          target="_blank"
        >
          Open on YouTube <ArrowUpRight size={14} />
        </a>
      </div>
    </dialog>
  );
}

export function LectureSources({ detail, text }) {
  const [active, setActive] = useState(null);
  if (!detail?.sources.length && !detail?.slides.length) return null;

  return (
    <div className="explain-sources">
      {detail.sources.map((source) => {
        const label = source.start
          ? `${source.start}–${source.end}`
          : "Lecture";
        const content = (
          <>
            <PlayCircle size={15} />
            <span>{source.lecture}</span>
            <b>{label}</b>
          </>
        );
        const key = `${source.lecture}-${source.start}`;
        return source.videoId ? (
          <button
            className="explain-source"
            key={key}
            onClick={() => setActive(source)}
            title="Watch this part of the lecture"
            type="button"
          >
            {content}
          </button>
        ) : (
          <span className="explain-source is-static" key={key}>
            {content}
          </span>
        );
      })}
      {detail.slides.map((slide) => (
        <span className="explain-source is-static" key={`slide-${slide}`}>
          <FileText size={15} />
          <span>Lecture notes</span>
          <b>Slide {slide}</b>
        </span>
      ))}
      {active && (
        <LecturePreview
          onClose={() => setActive(null)}
          source={active}
          text={text ?? detail.text}
        />
      )}
    </div>
  );
}

// `detail` comes from parseExplanation; `raw` covers older saved exam
// attempts that were stored before explanations were parsed.
export default function Explanation({ detail, raw, showSources = true }) {
  const text =
    detail?.text ?? String(raw ?? "").replace(/^\s*Explanation:\s*/i, "");
  if (!text && !detail?.sources.length && !detail?.slides.length) return null;

  return (
    <div className="explain">
      <span className="explain-label">
        <Lightbulb size={14} /> {text ? "Why" : "Source"}
      </span>
      {text && (
        <p className="explain-text">
          <LinkedText text={text} />
        </p>
      )}
      {showSources && <LectureSources detail={detail} text={text} />}
    </div>
  );
}
