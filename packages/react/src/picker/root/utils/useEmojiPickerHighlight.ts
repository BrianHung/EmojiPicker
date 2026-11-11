"use client";

import type { EmojiRecord } from "@emoji-components/core";
import type { EmojiGridMove } from "@emoji-components/core/grid";
import { useStore } from "../../../utils/useStore";
import { useEmojiPickerRootContext } from "../EmojiPickerRootContext";

export interface UseEmojiPickerHighlightReturnValue {
  emoji: EmojiRecord | null;
  highlight(emoji: string | null): void;
  move(to: EmojiGridMove): boolean;
  pick(emoji?: string): boolean;
}

export function useEmojiPickerHighlight(): UseEmojiPickerHighlightReturnValue {
  const { state, actions } = useEmojiPickerRootContext("useEmojiPickerHighlight");
  const emoji = useStore(state, (s) => s.active?.record ?? null);
  return { emoji, highlight: actions.highlight, move: actions.move, pick: actions.pick };
}
