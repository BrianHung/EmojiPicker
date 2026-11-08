import type * as React from "react";
import { SKIN_TONE_VALUES } from "@brianhung/emoji-picker-core/internal";

export const HIDDEN_OVERLAY: React.CSSProperties = { position: "absolute", visibility: "hidden" };

type Box = { x: number; y: number; width: number; height: number };

// The variations row sits centered over its cell, inside the content, and drops below the cell when the row above is scrolled away
export function variationsOverlay(cell: Box, contentWidth: number, visibleTop: number, list: HTMLElement): React.CSSProperties {
  const width = SKIN_TONE_VALUES.length * cell.width;
  const left = Math.max(0, Math.min(cell.x + cell.width / 2 - width / 2, contentWidth - width));
  const above = cell.y - cell.height;
  const top = above >= visibleTop ? above : cell.y + cell.height;
  return { position: "absolute", top: list.offsetTop + top, insetInlineStart: list.offsetLeft + left };
}
