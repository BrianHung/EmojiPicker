export type EmojiGridMove = "up" | "down" | "left" | "right" | "page-up" | "page-down" | "first" | "last";

// One vocabulary for every key a grid, strip, or suggestion list moves on
export const KEY_MOVES: Readonly<Record<string, EmojiGridMove>> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", PageUp: "page-up", PageDown: "page-down", Home: "first", End: "last" };

export const flipForRtl = (move: EmojiGridMove, rtl: boolean): EmojiGridMove => (rtl && move === "left" ? "right" : rtl && move === "right" ? "left" : move);
