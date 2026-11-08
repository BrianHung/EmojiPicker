import type { EmojiPopoverAnchor, EmojiPopoverContainer, EmojiPopoverSide } from "./types";

type Physical = "top" | "bottom" | "left" | "right";

export const physicalSide = (side: EmojiPopoverSide, rtl: boolean): Physical => (side === "inline-start" ? (rtl ? "right" : "left") : side === "inline-end" ? (rtl ? "left" : "right") : side);

// The side the positioner placed the content on, in the terms it was asked for: a flipped inline-start reports inline-end
export const placedSide = (side: EmojiPopoverSide, placed: string | null | undefined, rtl: boolean): EmojiPopoverSide =>
  !placed || placed === physicalSide(side, rtl) ? side : side === "inline-start" ? "inline-end" : side === "inline-end" ? "inline-start" : (placed as Physical);

const resolveAnchor = (anchor: EmojiPopoverAnchor | undefined) => (typeof anchor === "function" ? anchor() : anchor && "current" in anchor ? anchor.current : anchor);

export const anchorElement = (anchor: EmojiPopoverAnchor | undefined) => {
  const target = resolveAnchor(anchor);
  return target instanceof Element ? target : null;
};

export const anchorRect = (anchor: EmojiPopoverAnchor | undefined) => {
  const target = resolveAnchor(anchor);
  const r = target && "getBoundingClientRect" in target ? target.getBoundingClientRect() : target;
  return r ? new DOMRect(r.left, r.top, r.width, r.height) : undefined;
};

export const containerOf = (container: EmojiPopoverContainer | undefined) => (container ? ("current" in container ? container.current : container) : null) ?? undefined;
