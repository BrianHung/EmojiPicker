import type * as React from "react";
import { Emoji } from "@brianhung/emoji-picker";

const ROUNDED = "ui-rounded, 'SF Pro Rounded', system-ui";

function Haha() {
  return (
    <span aria-hidden className="flex flex-col items-center leading-[0.8] font-black tracking-[-0.05em]" style={{ fontSize: "0.56em", fontFamily: ROUNDED, color: "#5fd0ff", WebkitTextStroke: "0.08em #1592f2", paintOrder: "stroke fill" }}>
      <span>HA</span>
      <span>HA</span>
    </span>
  );
}

function Question() {
  return (
    <span aria-hidden className="font-black" style={{ fontSize: "1.18em", lineHeight: 1, fontFamily: ROUNDED, background: "linear-gradient(#cdb6ff, #8d63f2)", WebkitBackgroundClip: "text", color: "transparent" }}>
      ?
    </span>
  );
}

// As text: an <Emoji> of the same code would be overridden again
const native = (char: string) => (
  <span aria-hidden style={{ fontSize: "1em", lineHeight: 1 }}>
    {char}
  </span>
);

const TAPBACK_ARTWORK: Record<string, React.ReactNode> = {
  "2764-fe0f": <Emoji emoji="1fa77" style={{ fontSize: "1em", lineHeight: 1 }} />,
  "1f44d": native("👍"),
  "1f44e": native("👎"),
  "1f602": <Haha />,
  "203c-fe0f": native("‼️"),
  "2753": <Question />,
};

export const TAPBACKS: { unified: string; label: string }[] = [
  { unified: "2764-fe0f", label: "Heart" },
  { unified: "1f44d", label: "Like" },
  { unified: "1f44e", label: "Dislike" },
  { unified: "1f602", label: "Haha" },
  { unified: "203c-fe0f", label: "Emphasize" },
  { unified: "2753", label: "Question" },
];

export function TapbackGlyph({ unified, size, tapback = true }: { unified: string; size: number; tapback?: boolean }) {
  const art = tapback ? TAPBACK_ARTWORK[unified] : undefined;
  if (art === undefined) return <Emoji emoji={unified} size={size} style={{ fontSize: size, lineHeight: 1 }} />;
  return (
    <span className="inline-flex items-center justify-center" style={{ fontSize: size, lineHeight: 1 }}>
      {art}
    </span>
  );
}
