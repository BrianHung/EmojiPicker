"use client";

import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import { mergeRefs } from "react-aria/mergeRefs";
import { withoutTone } from "@brianhung/emoji-picker-core";
import type { ChangeDetails } from "@brianhung/emoji-picker-core";
import { createChangeDetails, nameWithTone } from "@brianhung/emoji-picker-core/internal";
import { usePicker } from "../root/context";
import { useDrawable } from "../emoji/native-support";
import { Glyph, useOverridden } from "../emoji/glyph";
import { useStoreSnapshot } from "../provider/provider";
import { ReactionsContext } from "./reactions-context";
import { mergePartProps } from "../utils/events";
import { useInteraction, type Clickable } from "../utils/interaction";
import { flag, renderElement, resolve, type EmojiPickerInteractionState, type EmojiPickerPartElementProps } from "../utils/render";
import { SLOTS } from "../utils/slots";
import { useChangeState } from "../utils/state";
import { useLayoutEffect } from "../utils/utils";
import { ReactionBar, type ReactionBarProps, type ReactionBarState } from "./reaction-bar";

const NONE: readonly string[] = [];

export type EmojiPickerReactionsChangeEventReason = "item-press";
export type EmojiPickerReactionsChangeEventDetails = ChangeDetails<EmojiPickerReactionsChangeEventReason> & { emoji: string; pressed: boolean };

type Row = { shown: readonly string[]; pressed: ReadonlySet<string> | null; press(unified: string, event: Event): void };
const RowContext = React.createContext<Row | null>(null);

function useRow(part: string) {
  const row = React.useContext(RowContext);
  if (!row) throw new Error(`EmojiPicker.Reactions${part} must be inside <EmojiPicker.Reactions>.`);
  return row;
}

export type ReactionsState = ReactionBarState;

export type ReactionsProps = Omit<ReactionBarProps, "children" | "orientation" | "defaultValue"> & {
  value?: readonly string[];
  defaultValue?: readonly string[];
  onValueChange?: (value: readonly string[], details: EmojiPickerReactionsChangeEventDetails) => void;
  children?: React.ReactNode | ((emoji: string) => React.ReactNode);
};

export const Reactions = React.forwardRef<HTMLDivElement, ReactionsProps>(function Reactions({ value: valueProp, defaultValue, onValueChange, children, ...props }, ref) {
  const picker = usePicker("EmojiPicker.Reactions");
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
        <ReactionsItems>{children}</ReactionsItems>
        <ReactionsExpand />
      </>
    ) : (
      children
    );
  return (
    <RowContext.Provider value={{ shown, pressed, press }}>
      <ReactionBar {...props} ref={refs} aria-label={labels.reactions} data-slot={SLOTS.reactions}>
        {content}
      </ReactionBar>
    </RowContext.Provider>
  );
});

export type ReactionsItemsProps = { children?: (emoji: string) => React.ReactNode };

export function ReactionsItems({ children }: ReactionsItemsProps) {
  const { shown } = useRow("Items");
  return shown.map((unified) => <React.Fragment key={unified}>{children ? children(unified) : <ReactionsItem emoji={unified} />}</React.Fragment>);
}

export type ReactionsItemState = EmojiPickerInteractionState & { selected: boolean };

export type ReactionsItemProps = EmojiPickerPartElementProps<ReactionsItemState, HTMLButtonElement, "onChange"> & {
  emoji: string;
};

export const ReactionsItem = React.forwardRef<HTMLButtonElement, ReactionsItemProps>(function ReactionsItem({ emoji: unified, style, children, ...props }, ref) {
  const picker = usePicker("EmojiPicker.ReactionsItem");
  const row = useRow("Item");
  const record = useStoreSnapshot((s) => s.get(unified));
  const overridden = useOverridden(unified, record);
  const selected = Boolean(row.pressed?.has(withoutTone(unified)));
  const { onClick, ...own } = mergePartProps<Clickable>(props, { onClick: (e: React.MouseEvent) => row.press(unified, e.nativeEvent) });
  const interaction = useInteraction({ onClick });
  return renderElement(
    "button",
    {
      type: "button",
      "aria-label": nameWithTone(record?.name ?? unified, unified, picker.labels.withSkinTone),
      "aria-pressed": row.pressed ? selected : undefined,
      ...mergeProps(own, interaction.props),
      ref,
      "data-slot": SLOTS.emoji,
      "data-unified": unified,
      "data-overridden": flag(overridden),
      "data-selected": flag(selected),
      style: (s: ReactionsItemState) => ({ maxWidth: "var(--ep-cell)", maxHeight: "var(--ep-cell)", ...resolve(style, s) }),
      children: children ?? <Glyph unified={unified} record={record} />,
    },
    { ...interaction.state, selected },
  );
});

export type ReactionsExpandState = EmojiPickerInteractionState;
export type ReactionsExpandProps = EmojiPickerPartElementProps<ReactionsExpandState, HTMLButtonElement>;

export const ReactionsExpand = React.forwardRef<HTMLButtonElement, ReactionsExpandProps>(function ReactionsExpand({ children, ...props }, ref) {
  const { labels } = usePicker("EmojiPicker.ReactionsExpand");
  const state = React.useContext(ReactionsContext);
  useRow("Expand");
  const { onClick, ...own } = mergePartProps<Clickable>(props, { onClick: (e: React.MouseEvent) => state?.expand?.(e.nativeEvent) });
  const interaction = useInteraction({ onClick });
  if (!state?.expand) return null;
  return renderElement(
    "button",
    {
      type: "button",
      title: labels.expandReactions,
      "aria-label": labels.expandReactions,
      // A disclosure for the Panel; Escape with no query collapses back to this row
      "aria-expanded": false,
      "aria-controls": state.panelId,
      ...mergeProps(own, interaction.props),
      ref,
      "data-slot": SLOTS.reactionsExpand,
      children: children ?? (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      ),
    },
    interaction.state,
  );
});

export declare namespace Reactions {
  type Props = ReactionsProps;
  type State = ReactionsState;
  type ChangeEventReason = EmojiPickerReactionsChangeEventReason;
  type ChangeEventDetails = EmojiPickerReactionsChangeEventDetails;
}

export declare namespace ReactionsItems {
  type Props = ReactionsItemsProps;
}

export declare namespace ReactionsItem {
  type Props = ReactionsItemProps;
  type State = ReactionsItemState;
}

export declare namespace ReactionsExpand {
  type Props = ReactionsExpandProps;
  type State = ReactionsExpandState;
}

export type PanelState = { hidden: boolean };
export type PanelProps = EmojiPickerPartElementProps<PanelState, HTMLDivElement, "hidden">;

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(function Panel({ style, ...props }, ref) {
  const state = React.useContext(ReactionsContext);
  const register = state?.registerPanel;
  useLayoutEffect(() => register?.(), [register]);
  const hidden = Boolean(state?.open);
  const refs = React.useMemo(() => mergeRefs<HTMLDivElement>(ref, state?.panel), [ref, state?.panel]);
  return renderElement(
    "div",
    { "data-slot": SLOTS.panel, id: state?.panelId, ...props, ref: refs, hidden, inert: hidden || undefined, style: (s: PanelState) => (s.hidden ? { ...resolve(style, s), display: "none" } : resolve(style, s)) },
    { hidden },
  );
});

export declare namespace Panel {
  type Props = PanelProps;
  type State = PanelState;
}
