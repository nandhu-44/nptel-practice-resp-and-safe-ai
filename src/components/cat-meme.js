const FUR = "#e8a15b";
const FUR_DARK = "#c47f38";
const INK = "#2b211a";

const moods = {
  idle: ["Flip the card, human.", "Do the flashcards. Or don't. I'm a cat."],
  happy: ["Purrfect.", "Big brain. Much wow.", "Nailed it, hooman."],
  smug: ["Too easy.", "Knew it. Obviously.", "I am the model here."],
  grumpy: [
    "Nope. Try again.",
    "Disappointed. But not surprised.",
    "This is fine. (it isn't)",
  ],
  shocked: ["Wait, WHAT?", "You forgot... that?!", "I can't even."],
  sleepy: [
    "Zzz... one more card.",
    "Study nap incoming.",
    "Wake me at the exam.",
  ],
  party: ["Deck cleared!", "Absolute legend.", "Treats. Now."],
};

export function pickCaption(mood, seed = 0) {
  const list = moods[mood] ?? moods.idle;
  return list[Math.abs(seed) % list.length];
}

function Eyes({ mood }) {
  if (mood === "happy" || mood === "party") {
    return (
      <g fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round">
        <path d="M62 84 Q73 70 84 84" />
        <path d="M116 84 Q127 70 138 84" />
      </g>
    );
  }
  if (mood === "sleepy") {
    return (
      <g stroke={INK} strokeWidth="4" strokeLinecap="round">
        <path d="M62 82 H84" />
        <path d="M116 82 H138" />
      </g>
    );
  }
  if (mood === "smug") {
    return (
      <g>
        <rect x="52" y="70" width="42" height="20" rx="6" fill={INK} />
        <rect x="106" y="70" width="42" height="20" rx="6" fill={INK} />
        <rect x="94" y="76" width="12" height="4" fill={INK} />
        <path
          d="M58 74 H72"
          stroke="#fff"
          strokeOpacity=".5"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M112 74 H126"
          stroke="#fff"
          strokeOpacity=".5"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
    );
  }
  if (mood === "grumpy") {
    return (
      <g>
        <ellipse cx="73" cy="84" rx="9" ry="8" fill="#fff" />
        <ellipse cx="127" cy="84" rx="9" ry="8" fill="#fff" />
        <circle cx="73" cy="86" r="4" fill={INK} />
        <circle cx="127" cy="86" r="4" fill={INK} />
        <path
          d="M58 68 L88 78"
          stroke={INK}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M142 68 L112 78"
          stroke={INK}
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>
    );
  }
  if (mood === "shocked") {
    return (
      <g>
        <circle cx="73" cy="82" r="13" fill="#fff" />
        <circle cx="127" cy="82" r="13" fill="#fff" />
        <circle cx="73" cy="82" r="3.5" fill={INK} />
        <circle cx="127" cy="82" r="3.5" fill={INK} />
      </g>
    );
  }
  return (
    <g>
      <ellipse cx="73" cy="82" rx="8" ry="11" fill={INK} />
      <ellipse cx="127" cy="82" rx="8" ry="11" fill={INK} />
      <circle cx="76" cy="78" r="3" fill="#fff" />
      <circle cx="130" cy="78" r="3" fill="#fff" />
    </g>
  );
}

function Mouth({ mood }) {
  const common = {
    fill: "none",
    stroke: INK,
    strokeWidth: 3.5,
    strokeLinecap: "round",
  };
  if (mood === "shocked")
    return <ellipse cx="100" cy="120" rx="8" ry="11" fill={INK} />;
  if (mood === "grumpy")
    return <path d="M84 125 Q100 111 116 125" {...common} />;
  if (mood === "sleepy")
    return <ellipse cx="100" cy="119" rx="5" ry="4" fill={INK} />;
  if (mood === "party" || mood === "happy")
    return (
      <path
        d="M82 112 Q100 134 118 112 Q100 120 82 112Z"
        fill={INK}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
    );
  if (mood === "smug") return <path d="M86 114 Q100 124 118 108" {...common} />;
  return <path d="M88 112 Q94 122 100 114 Q106 122 112 112" {...common} />;
}

export default function CatMeme({ mood = "idle", caption, size = "md" }) {
  const text = caption ?? pickCaption(mood);
  return (
    <figure className={`cat-meme cat-${size}`} data-mood={mood}>
      <svg
        viewBox="0 0 200 190"
        role="img"
        aria-label={`Cat looking ${mood}: ${text}`}
      >
        <title>{`Cat looking ${mood}`}</title>
        {mood === "party" && (
          <g>
            <path d="M100 4 L82 44 H118 Z" fill="var(--accent)" />
            <circle cx="100" cy="4" r="6" fill="#ffd36b" />
            <circle cx="34" cy="30" r="4" fill="#7fcf9f" />
            <circle cx="170" cy="40" r="5" fill="#ffd36b" />
            <rect
              x="152"
              y="14"
              width="8"
              height="8"
              fill="var(--accent)"
              transform="rotate(25 156 18)"
            />
            <rect
              x="30"
              y="58"
              width="7"
              height="7"
              fill="#6aa9ff"
              transform="rotate(-20 33 61)"
            />
          </g>
        )}
        <path
          d="M34 52 L40 6 L84 36 Z"
          fill={FUR}
          stroke={INK}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M166 52 L160 6 L116 36 Z"
          fill={FUR}
          stroke={INK}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path d="M44 38 L46 18 L66 33 Z" fill="#f4b3b8" />
        <path d="M156 38 L154 18 L134 33 Z" fill="#f4b3b8" />
        <ellipse
          cx="100"
          cy="92"
          rx="72"
          ry="62"
          fill={FUR}
          stroke={INK}
          strokeWidth="4"
        />
        <path
          d="M100 32 V50 M84 36 L88 52 M116 36 L112 52"
          stroke={FUR_DARK}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <ellipse
          cx="100"
          cy="116"
          rx="30"
          ry="22"
          fill="#f6e3c8"
          opacity=".9"
        />
        <Eyes mood={mood} />
        <path
          d="M94 100 H106 L100 108 Z"
          fill="#e0707f"
          stroke={INK}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <Mouth mood={mood} />
        <g stroke={INK} strokeWidth="2.5" strokeLinecap="round" opacity=".7">
          <path d="M60 104 L22 98 M60 112 L22 116 M140 104 L178 98 M140 112 L178 116" />
        </g>
        {mood === "sleepy" && (
          <g
            fill={INK}
            fontFamily="var(--font-geist-mono), monospace"
            fontWeight="700"
          >
            <text x="150" y="40" fontSize="20">
              z
            </text>
            <text x="166" y="24" fontSize="15">
              z
            </text>
          </g>
        )}
        {mood === "grumpy" && (
          <path
            d="M138 52 q4 -8 8 0 M146 46 q4 -8 8 0"
            fill="none"
            stroke="#e0505a"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}
      </svg>
      <figcaption>{text}</figcaption>
    </figure>
  );
}
