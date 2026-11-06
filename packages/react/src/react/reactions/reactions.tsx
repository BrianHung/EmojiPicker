import * as React from "react";
import { mergeRefs } from "react-aria/mergeRefs";
import { type ChangeDetails, nameWithTone, withoutTone } from "@brianhung/emoji-picker-core";
import { usePicker } from "../root/context";
import { useDrawable } from "../emoji/native-support";
import { Glyph, useOverridden } from "../emoji/glyph";
import { useStoreSnapshot } from "../provider/provider";
import { ReactionsContext } from "./reactions-context";
import { mergePartProps } from "../utils/events";
import { useInteraction } from "../utils/interaction";
import { flag, renderElement, resolve, type InteractionState, type PartElementProps } from "../utils/render";
import { SLOTS } from "../utils/slots";
import { useChangeState } from "../utils/state";
import { BUTTONS, ReactionBar, type ReactionBarProps, type ReactionBarState } from "./reaction-bar";
import { useLayoutEffect } from "../utils/utils";

export type ReactionsValueChangeDetails = ChangeDetails<"item-press"> & { emoji: string; pressed: boolean };

type Row = { shown: readonly string[]; pressed: ReadonlySet<string> | null; press(unified: string, event: Event): void; expanding: React.MutableRefObject<boolean> };
const RowContext = React.createContext<Row | null>(null);

function useRow(part: string) {
  const row = React.useContext(RowContext);
  if (!row) throw new Error(`EmojiPicker.Reactions.${part} must be inside <EmojiPicker.Reactions>.`);
  return row;
}

export type ReactionsState = ReactionBarState;

export type ReactionsProps = Omit<ReactionBarProps, "children" | "orientation" | "defaultValue"> & {
  value?: readonly string[];
  defaultValue?: readonly string[];
  onValueChange?: (value: readonly string[], details: ReactionsValueChangeDetails) => void;
  children?: React.ReactNode | ((emoji: string) => React.ReactNode);
};

const ReactionsRoot = React.forwardRef<HTMLDivElement, ReactionsProps>(function Reactions({ value: valueProp, defaultValue, onValueChange, children, ...props }, ref) {
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
  React.useEffect(() => request(shown));
  // Toggle buttons once the row has a value, as in Base UI's ToggleGroup
  const tracked = defaultValue !== undefined || onValueChange !== undefined ? (defaultValue ?? []) : undefined;
  const [value, setValue] = useChangeState<readonly string[] | undefined, "item-press", { emoji: string; pressed: boolean }>(valueProp, tracked, onValueChange as never);
  const pressed = React.useMemo(() => (value ? new Set(value.map(withoutTone)) : null), [value]);
  const press = (unified: string, event: Event) => {
    if (!value || !pressed) return void picker.pick(unified, event);
    const on = !pressed.has(withoutTone(unified));
    const details = setValue(on ? [...value, unified] : value.filter((v) => withoutTone(v) !== withoutTone(unified)), "item-press", event, { emoji: unified, pressed: on });
    if (on && !details?.isCanceled) picker.pick(unified, event);
  };
  const expanding = React.useRef(false);
  React.useEffect(() => {
    if (!expanding.current || state?.open) return;
    expanding.current = false;
    const search = picker.searchInput.current;
    if (search) search.focus({ preventScroll: true });
    else picker.list.current?.focus();
  }, [state?.open]);
  const wasOpen = React.useRef(state?.open);
  React.useEffect(() => {
    const reopened = state?.open && wasOpen.current === false;
    wasOpen.current = state?.open;
    const el = row.current;
    if (!reopened || !el) return;
    const active = document.activeElement;
    if (active && active !== document.body && !state?.panel.current?.contains(active)) return;
    el.querySelector<HTMLElement>(BUTTONS)?.focus({ preventScroll: true });
  }, [state?.open]);
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
    <RowContext.Provider value={{ shown, pressed, press, expanding }}>
      <ReactionBar {...props} ref={mergeRefs<HTMLDivElement>(ref, row)} aria-label={labels.reactions} data-slot={SLOTS.reactions}>
        {content}
      </ReactionBar>
    </RowContext.Provider>
  );
});

export type ReactionsItemsProps = { children?: (emoji: string) => React.ReactNode };

function ReactionsItems({ children }: ReactionsItemsProps) {
  const { shown } = useRow("Items");
  return shown.map((unified) => <React.Fragment key={unified}>{children ? children(unified) : <ReactionsItem emoji={unified} />}</React.Fragment>);
}

export type ReactionsItemState = InteractionState & { selected: boolean };

export type ReactionsItemProps = PartElementProps<ReactionsItemState, HTMLButtonElement, "onChange"> & {
  emoji: string;
};

const ReactionsItem = React.forwardRef<HTMLButtonElement, ReactionsItemProps>(function ReactionsItem({ emoji: unified, style, children, ...props }, ref) {
  const picker = usePicker("EmojiPicker.Reactions.Item");
  const row = useRow("Item");
  const record = useStoreSnapshot((s) => s.get(unified));
  const overridden = useOverridden(unified, record);
  const interaction = useInteraction();
  const selected = Boolean(row.pressed?.has(withoutTone(unified)));
  return renderElement(
    "button",
    {
      type: "button",
      "aria-label": nameWithTone(record?.name ?? unified, unified, picker.labels.withSkinTone),
      "aria-pressed": row.pressed ? selected : undefined,
      ...mergePartProps(props, interaction.props, { onClick: (e: React.MouseEvent) => row.press(unified, e.nativeEvent) }),
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

export type ReactionsExpandState = InteractionState;
export type ReactionsExpandProps = PartElementProps<ReactionsExpandState, HTMLButtonElement>;

const ReactionsExpand = React.forwardRef<HTMLButtonElement, ReactionsExpandProps>(function ReactionsExpand({ children, ...props }, ref) {
  const { labels } = usePicker("EmojiPicker.Reactions.Expand");
  const state = React.useContext(ReactionsContext);
  const { expanding } = useRow("Expand");
  const interaction = useInteraction();
  if (!state?.expand) return null;
  const expand = state.expand;
  return renderElement(
    "button",
    {
      type: "button",
      title: labels.expandReactions,
      "aria-label": labels.expandReactions,
      // A disclosure for the Panel; Escape with no query collapses back to this row
      "aria-expanded": false,
      "aria-controls": state.panelId,
      ...mergePartProps(props, interaction.props, {
        onClick: () => {
          expanding.current = true;
          expand();
        },
      }),
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

export const Reactions = /* @__PURE__ */ Object.assign(ReactionsRoot, { Items: ReactionsItems, Item: ReactionsItem, Expand: ReactionsExpand });

type RowProps = ReactionsProps;
type RowState = ReactionsState;
type ItemsProps = ReactionsItemsProps;

export declare namespace Reactions {
  type Props = RowProps;
  type State = RowState;
  type ValueChangeDetails = ReactionsValueChangeDetails;
  namespace Items {
    type Props = ItemsProps;
  }
  namespace Item {
    type Props = ReactionsItemProps;
    type State = ReactionsItemState;
  }
  namespace Expand {
    type Props = ReactionsExpandProps;
    type State = ReactionsExpandState;
  }
}

export type PanelState = { hidden: boolean };
export type PanelProps = PartElementProps<PanelState, HTMLDivElement, "hidden">;

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
