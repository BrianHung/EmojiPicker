"use client";

import * as React from "react";
import { mergeRefs } from "react-aria/mergeRefs";
import { withoutTone, type ChangeDetails } from "@brianhung/emoji-picker-core";
import { createChangeDetails } from "@brianhung/emoji-picker-core/internal";
import { ReactionsContext, useEmojiPickerRootContext } from "../root/EmojiPickerRootContext";
import { useDrawable } from "../../emoji/utils/useDrawable";
import { useStoreSnapshot } from "../../provider/EmojiProviderContext";
import { SLOTS } from "../../internals/slots";
import { useChangeState } from "../../utils/useChangeState";
import { EmojiPickerReactionsExpand } from "../reactions-expand/EmojiPickerReactionsExpand";
import { EmojiPickerReactionsItems } from "../reactions-items/EmojiPickerReactionsItems";
import { EmojiPickerReactionsContext } from "../reactions/EmojiPickerReactionsContext";
import { ReactionBar, type ReactionBarProps, type ReactionBarState } from "./ReactionBar";

const NONE: readonly string[] = [];

export type EmojiPickerReactionsChangeEventReason = "item-press";
export type EmojiPickerReactionsChangeEventDetails = ChangeDetails<EmojiPickerReactionsChangeEventReason> & { emoji: string; pressed: boolean };

export type EmojiPickerReactionsState = ReactionBarState;

export type EmojiPickerReactionsProps = Omit<ReactionBarProps, "children" | "orientation" | "defaultValue"> & {
  value?: readonly string[];
  defaultValue?: readonly string[];
  onValueChange?: (value: readonly string[], details: EmojiPickerReactionsChangeEventDetails) => void;
  children?: React.ReactNode | ((emoji: string) => React.ReactNode);
};

export const EmojiPickerReactions = React.forwardRef<HTMLDivElement, EmojiPickerReactionsProps>(function EmojiPickerReactions({ value: valueProp, defaultValue, onValueChange, children, ...props }, ref) {
  const picker = useEmojiPickerRootContext("EmojiPicker.Reactions");
  const state = React.useContext(ReactionsContext);
  const { store, labels } = picker;
  useStoreSnapshot((s) => s.records());
  const row = React.useRef<HTMLDivElement | null>(null);
  const { drawable, request } = useDrawable(row);
  const shown = (state?.reactions ?? [])
    .map((base) => store.withSkinTone(base))
    .filter((unified) => {
      const record = store.get(unified);
      return record != null && drawable(record, unified);
    });
  const probed = shown.join(" ");
  React.useEffect(() => request(probed ? probed.split(" ") : NONE), [request, probed]);
  // Toggle buttons once the row has a value, as in Base UI's ToggleGroup
  const toggles = defaultValue !== undefined || onValueChange !== undefined || valueProp !== undefined;
  const [value, setValue] = useChangeState(valueProp, defaultValue ?? NONE, onValueChange);
  const pressed = React.useMemo(() => (toggles ? new Set(value.map(withoutTone)) : null), [toggles, value]);
  const press = (unified: string, event: Event) => {
    if (!pressed) return void picker.pick(unified, event);
    const on = !pressed.has(withoutTone(unified));
    const next = on ? [...value, unified] : value.filter((v) => withoutTone(v) !== withoutTone(unified));
    const details = setValue(next, Object.assign(createChangeDetails("item-press" as const, event), { emoji: unified, pressed: on }));
    if (on && !details?.isCanceled) picker.pick(unified, event);
  };
  const refs = React.useMemo(() => mergeRefs<HTMLDivElement>(ref, row, state?.row), [ref, state?.row]);
  if (!state?.open) return null;
  const content =
    typeof children === "function" || children === undefined ? (
      <>
        <EmojiPickerReactionsItems>{children}</EmojiPickerReactionsItems>
        <EmojiPickerReactionsExpand />
      </>
    ) : (
      children
    );
  return (
    <EmojiPickerReactionsContext.Provider value={{ shown, pressed, press }}>
      <ReactionBar {...props} ref={refs} aria-label={labels.reactions} data-slot={SLOTS.reactions}>
        {content}
      </ReactionBar>
    </EmojiPickerReactionsContext.Provider>
  );
});

export declare namespace EmojiPickerReactions {
  type Props = EmojiPickerReactionsProps;
  type State = EmojiPickerReactionsState;
  type ChangeEventReason = EmojiPickerReactionsChangeEventReason;
  type ChangeEventDetails = EmojiPickerReactionsChangeEventDetails;
}
