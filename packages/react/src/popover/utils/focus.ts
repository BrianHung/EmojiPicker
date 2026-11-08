import { emojiPickerInitialFocus } from "../../picker/utils/emojiPickerInitialFocus";
import type { PopoverState } from "../root/EmojiPopoverRootContext";
import type { EmojiPopoverFinalFocus, EmojiPopoverInitialFocus, EmojiPopoverInteractionType } from "./types";

export const interactionOf = (event?: Event): EmojiPopoverInteractionType => {
  if (event instanceof KeyboardEvent) return "keyboard";
  if (!(event instanceof MouseEvent)) return "";
  const pointer = (event as Partial<PointerEvent>).pointerType as EmojiPopoverInteractionType | undefined;
  return pointer || (event.detail === 0 && event.type === "click" ? "keyboard" : "mouse");
};

// Base UI's focus props: true or null keeps the default, false or nothing leaves focus where it is
const resolveFocus = (focus: EmojiPopoverInitialFocus | EmojiPopoverFinalFocus | undefined, type: EmojiPopoverInteractionType): HTMLElement | boolean => {
  if (focus === undefined || typeof focus === "boolean") return focus ?? true;
  const target = typeof focus === "function" ? focus(type) : focus.current;
  return target === null || target === true ? true : target || false;
};

export function initialFocusTarget(state: PopoverState, initialFocus: EmojiPopoverInitialFocus | undefined, content: Element | null): HTMLElement | false | null {
  const target = resolveFocus(initialFocus, state.interaction.current);
  state.focusGrid.current = target === true;
  return target === true ? emojiPickerInitialFocus(content) : target;
}

export const finalFocusTarget = (state: PopoverState, finalFocus: EmojiPopoverFinalFocus | undefined) => resolveFocus(finalFocus, state.interaction.current);
