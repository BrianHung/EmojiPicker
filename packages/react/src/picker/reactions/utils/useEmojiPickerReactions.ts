"use client";

import * as React from "react";
import { withoutTone, type ChangeDetails } from "@emoji-components/core";
import { createChangeDetails, isUnified, nameWithTone } from "@emoji-components/core/internal";
import { mergePartProps } from "../../../internals/mergePartProps";
import { useStoreSnapshot } from "../../../provider/EmojiProviderContext";
import { useChangeState } from "../../../utils/useChangeState";
import { ReactionsContext, useEmojiPickerRootContext } from "../../root/EmojiPickerRootContext";

const NONE: readonly string[] = [];

export type EmojiPickerReactionsChangeEventReason = "item-press";
export type EmojiPickerReactionsChangeEventDetails = ChangeDetails<EmojiPickerReactionsChangeEventReason> & { emoji: string; pressed: boolean };

export interface UseEmojiPickerReactionsOptions {
  value?: readonly string[];
  defaultValue?: readonly string[];
  onValueChange?: (value: readonly string[], details: EmojiPickerReactionsChangeEventDetails) => void;
}

type ButtonProps = { type: "button"; "aria-label": string; onClick: (event: React.MouseEvent) => void };

export interface UseEmojiPickerReactionsReturnValue {
  reactions: readonly string[];
  open: boolean;
  setOpen(open: boolean): void;
  // Toggle buttons once the row has a value, as in Base UI's ToggleGroup; null otherwise
  value: readonly string[] | null;
  // A Panel is mounted for Expand to open
  expandable: boolean;
  getItemProps<P extends object = object>(emoji: string, props?: P): P & ButtonProps & { "aria-pressed": boolean | undefined; ref: React.RefCallback<HTMLElement> };
  getExpandProps<P extends object = object>(props?: P): P & ButtonProps & { title: string; "aria-expanded": false; "aria-controls": string | undefined };
}

export function useEmojiPickerReactions({ value: valueProp, defaultValue, onValueChange }: UseEmojiPickerReactionsOptions = {}): UseEmojiPickerReactionsReturnValue {
  const { store, state, labels, native } = useEmojiPickerRootContext("useEmojiPickerReactions");
  const row = React.useContext(ReactionsContext);
  useStoreSnapshot((s) => s.records());
  // Before the data loads, on the server too, the row draws from the codes, so it keeps its size
  const ready = store.status() === "ready";
  const reactions = (row?.reactions ?? NONE)
    .map((base) => store.withSkinTone(base))
    .filter((unified) => {
      const record = store.get(unified);
      return record ? native.drawable(record, unified) : !ready && isUnified(unified);
    });
  const probed = reactions.join(" ");
  const { request } = native;
  React.useEffect(() => request(probed ? probed.split(" ") : NONE), [request, probed]);
  const toggles = defaultValue !== undefined || onValueChange !== undefined || valueProp !== undefined;
  const [value, setValue] = useChangeState(valueProp, defaultValue ?? NONE, onValueChange);
  const pressed = React.useMemo(() => (toggles ? new Set(value.map(withoutTone)) : null), [toggles, value]);
  const setOpen = React.useCallback((open: boolean) => void state.setReactionsOpen(open), [state]);
  const press = (unified: string, event: Event) => {
    if (!pressed) return void state.pick(unified, { reason: "item-press", event });
    const on = !pressed.has(withoutTone(unified));
    const next = on ? [...value, unified] : value.filter((v) => withoutTone(v) !== withoutTone(unified));
    const details = setValue(next, Object.assign(createChangeDetails("item-press" as const, event), { emoji: unified, pressed: on }));
    if (on && !details?.isCanceled) state.pick(unified, { reason: "item-press", event });
  };
  const items = row?.items;
  return {
    reactions,
    open: Boolean(row?.open),
    setOpen,
    value: pressed ? value : null,
    expandable: Boolean(row?.expandable),
    getItemProps: <P extends object = object>(unified: string, props?: P) =>
      ({
        type: "button",
        "aria-label": nameWithTone(store.get(unified)?.name ?? unified, unified, labels.withSkinTone),
        "aria-pressed": pressed ? pressed.has(withoutTone(unified)) : undefined,
        ...mergePartProps<object>(props ?? {}, { ref: (el: HTMLElement | null) => void (el ? items?.set(unified, el) : items?.delete(unified)), onClick: (e: React.MouseEvent) => press(unified, e.nativeEvent) }),
      }) as never,
    getExpandProps: <P extends object = object>(props?: P) =>
      ({
        type: "button",
        title: labels.expandReactions,
        "aria-label": labels.expandReactions,
        // A disclosure for the Panel; Escape with no query collapses back to this row
        "aria-expanded": false,
        "aria-controls": row?.panelId,
        ...mergePartProps<object>(props ?? {}, { ref: row?.expand, onClick: (e: React.MouseEvent) => void state.setReactionsOpen(false, { reason: "trigger-press", event: e.nativeEvent }) }),
      }) as never,
  };
}
