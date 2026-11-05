import type * as React from "react";

const SCREEN = { width: 402, height: 874, radius: 62.7 } as const;
const RIM = 8.5;
const BEZEL = 9.2;
const FRAME = RIM + BEZEL;
const OUTER_RADIUS = 77;
const BUTTON = 5;

const OUTER = { width: SCREEN.width + FRAME * 2, height: SCREEN.height + FRAME * 2 };
const FRAME_SIZE = { width: OUTER.width + BUTTON * 2, height: OUTER.height };

const BUTTONS: { side: "left" | "right"; top: number; bottom: number }[] = [
  { side: "left", top: 141, bottom: 177 },
  { side: "left", top: 202, bottom: 268 },
  { side: "left", top: 281, bottom: 346 },
  { side: "right", top: 243, bottom: 346 },
];

export function IPhoneFrame({ children, scale = 1, className, style }: { children: React.ReactNode; scale?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={className} style={{ width: FRAME_SIZE.width * scale, height: FRAME_SIZE.height * scale, flexShrink: 0, ...style }}>
      <div data-iphone-frame="" style={{ position: "relative", width: FRAME_SIZE.width, height: FRAME_SIZE.height, transform: scale === 1 ? undefined : `scale(${scale})`, transformOrigin: "0 0" }}>
        {BUTTONS.map((b) => (
          <span
            key={`${b.side}${b.top}`}
            aria-hidden
            style={{
              position: "absolute",
              top: FRAME + b.top,
              height: b.bottom - b.top,
              [b.side]: 0,
              width: BUTTON + 4,
              borderRadius: b.side === "left" ? "2.5px 0 0 2.5px" : "0 2.5px 2.5px 0",
              background: `linear-gradient(to ${b.side === "left" ? "right" : "left"}, #1c1c1c, #4a4a4a 35%, #2c2c2c 70%, #232323)`,
              boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.12), inset 0 -1px 0 rgb(0 0 0 / 0.5)",
            }}
          />
        ))}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: BUTTON,
            top: 0,
            width: OUTER.width,
            height: OUTER.height,
            borderRadius: OUTER_RADIUS,
            background: "linear-gradient(160deg, #3a3a3a 0%, #2c2c2c 30%, #262626 60%, #2f2f2f 100%)",
            boxShadow: "inset 0 0 0 1.1px #121212, inset 0 0 0 2.1px rgb(125 125 125), inset 0 0 0 3.4px rgb(58 58 58), 0 18px 50px rgb(0 0 0 / 0.28), 0 4px 14px rgb(0 0 0 / 0.18)",
          }}
        />
        <div
          aria-hidden
          style={{ position: "absolute", left: BUTTON + RIM, top: RIM, width: OUTER.width - RIM * 2, height: OUTER.height - RIM * 2, borderRadius: OUTER_RADIUS - RIM, background: "#000", boxShadow: "0 0 0 0.6px rgb(0 0 0 / 0.9)" }}
        />
        <div
          data-iphone-screen=""
          style={{
            position: "absolute",
            left: BUTTON + FRAME,
            top: FRAME,
            width: SCREEN.width,
            height: SCREEN.height,
            borderRadius: SCREEN.radius,
            overflow: "hidden",
            // Safari drops the rounded clip on transformed children without this
            isolation: "isolate",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
