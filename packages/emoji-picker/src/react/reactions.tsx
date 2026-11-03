// A reaction row: React Aria's Toolbar (arrows move along it) with one tab stop
// (roving tabindex), Home and End, and hover continuity: once focus is in the row it
// follows the pointer, so the next arrow continues from the hovered reaction.
import * as React from "react";
import { Button, ToggleButton, Toolbar } from "react-aria-components";
import { withoutTone } from "../core/dataset";
import type { EmojiCellProps, ListEmoji } from "./components";
import { usePicker } from "./context";
import { mergeRefs, useEdgeKeys } from "./keyboard";
import { ArtworkGlyph, findArtwork, useArtworkMap } from "./overrides";
import { useEmojiContext } from "./provider";
import { EmojiImage } from "./image";
import { SLOTS } from "./slots";
import { isUnified, unifiedToNative } from "../core/dataset";
import { nameWithTone } from "../core/shortcodes";

export type ReactionsState = {
  reactions: readonly string[];
  /** The compact row shows (false: the full picker). */
  open: boolean;
  /** Opens the full picker; undefined when the row can't expand. */
  expand?: () => void;
  /** The user's current reactions (base codes): their buttons are toggles, pressed. */
  pressed: ReadonlySet<string> | null;
};
export const ReactionsContext = React.createContext<ReactionsState | null>(null);

/** A code without skin-tone modifiers, lowercased: how reactions are compared. */
export const reactionKey = (unified: string) => withoutTone(unified.toLowerCase());

/** Whether a reaction button's emoji is one of the user's, in any skin tone. */
export const isPressed = (selected: ReadonlySet<string>, unified: string) => selected.has(reactionKey(unified));

const BUTTONS = "button:not([disabled])";

/** Roving tabindex over a row's buttons, Home/End, and focus following the pointer within the row. */
function useRovingRow(row: React.RefObject<HTMLElement | null>) {
  const current = React.useRef(0);
  React.useLayoutEffect(() => {
    const buttons = [...(row.current?.querySelectorAll<HTMLElement>(BUTTONS) ?? [])];
    const stop = Math.min(current.current, buttons.length - 1);
    buttons.forEach((b, i) => (b.tabIndex = i === stop ? 0 : -1));
  });
  React.useEffect(() => {
    const el = row.current;
    if (!el) return;
    const onFocus = (event: FocusEvent) => {
      const buttons = [...el.querySelectorAll<HTMLElement>(BUTTONS)];
      const i = buttons.indexOf(event.target as HTMLElement);
      if (i < 0) return;
      current.current = i;
      buttons.forEach((b, j) => (b.tabIndex = j === i ? 0 : -1));
    };
    const onHover = (event: PointerEvent) => {
      const button = event.target instanceof Element ? event.target.closest<HTMLElement>(BUTTONS) : null;
      const active = document.activeElement;
      if (button && button !== active && el.contains(button) && active instanceof HTMLElement && el.contains(active)) button.focus({ preventScroll: true });
    };
    // Home and End go to the ends (a picker's dispatcher takes them first, by its keymap).
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || (event.key !== "Home" && event.key !== "End") || event.ctrlKey || event.metaKey || event.altKey) return;
      const buttons = [...el.querySelectorAll<HTMLElement>(BUTTONS)];
      const target = event.key === "Home" ? buttons[0] : buttons[buttons.length - 1];
      if (!target) return;
      event.preventDefault();
      target.focus();
    };
    el.addEventListener("focusin", onFocus);
    el.addEventListener("pointerover", onHover);
    el.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("focusin", onFocus);
      el.removeEventListener("pointerover", onHover);
      el.removeEventListener("keydown", onKey);
    };
  }, [row]);
}

export type ReactionBarProps = Omit<React.HTMLAttributes<HTMLDivElement>, "role"> & {
  /** Axis the arrows move along. Default "horizontal". */
  orientation?: "horizontal" | "vertical";
};

/**
 * A row of reaction buttons (yours, or a Tapback's): one tab stop; arrows, Home and End
 * move along it; with focus in the row, focus follows the hovered button.
 */
export const ReactionBar = React.forwardRef<HTMLDivElement, ReactionBarProps>(function ReactionBar({ orientation = "horizontal", className, ...props }, ref) {
  const row = React.useRef<HTMLDivElement | null>(null);
  useRovingRow(row);
  return <Toolbar {...(props as object)} ref={mergeRefs(ref, row)} orientation={orientation} className={className ?? ""} />;
});

/** The emoji a reaction button draws: artwork, an image (custom, Twemoji) or the native glyph. */
function ReactionGlyph({ unified }: { unified: string }) {
  const { store, renderer, imageUrl } = useEmojiContext();
  const artwork = useArtworkMap();
  const record = store.get(unified);
  const art = artwork ? findArtwork(artwork, unified) : undefined;
  const size = "var(--emoji-image-size, var(--ep-size))";
  if (art !== undefined) return <ArtworkGlyph art={art} alt={record?.name ?? unified} size={size} />;
  const src = record?.imageUrl ?? (renderer === "twemoji" && isUnified(unified) ? imageUrl(unified) : undefined);
  if (src) return <EmojiImage src={src} alt={record?.name ?? unified} record={record} size={size} animate={false} fallback={record?.imageUrl ? undefined : unifiedToNative(unified)} />;
  return <span data-glyph="">{unifiedToNative(unified)}</span>;
}

/**
 * A tapback's reaction row: one tab stop (roving tabindex); arrows, Home and End
 * (the keymap's first/last) move along it. "+" expands into the full picker with
 * focus in its search field.
 */
export const Reactions = React.forwardRef<HTMLDivElement, Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "role">>(function Reactions(props, ref) {
  const picker = usePicker("EmojiPicker.Reactions");
  const state = React.useContext(ReactionsContext);
  const { store, labels, components } = picker;
  const artwork = useArtworkMap();
  const edges = useEdgeKeys(BUTTONS);
  const row = React.useRef<HTMLDivElement | null>(null);
  const expandFocus = React.useRef(false);
  React.useEffect(() => {
    if (!expandFocus.current || state?.open) return;
    expandFocus.current = false;
    // The full picker: focus its search field (else its first emoji) once it shows.
    let tries = 20;
    const root = row.current?.closest(`[data-slot="${SLOTS.root}"]`) ?? document;
    const land = () => {
      const target = root.querySelector<HTMLElement>(`[data-slot="${SLOTS.searchInput}"]`) ?? root.querySelector<HTMLElement>(`[data-slot="${SLOTS.emoji}"]`);
      if (target?.getClientRects().length) target.focus({ preventScroll: true });
      else if (--tries > 0) requestAnimationFrame(land);
    };
    requestAnimationFrame(land);
  }, [state?.open]);
  if (!state || !state.open) return null;
  const User = components.Emoji;
  const Expand = components.ExpandButton;
  return (
    <ReactionBar {...props} ref={mergeRefs(ref, row, edges)} aria-label={labels.reactions} data-slot={SLOTS.reactions}>
      {state.reactions.map((base) => {
        const unified = store.withSkinTone(base);
        const record = store.get(unified);
        const name = nameWithTone(record?.name ?? unified, unified, labels.withSkinTone);
        const on = state.pressed ? isPressed(state.pressed, unified) : undefined;
        const attrs = {
          "aria-label": name,
          "data-slot": SLOTS.emoji,
          "data-unified": unified,
          "data-overridden": artwork && findArtwork(artwork, unified) !== undefined ? "" : undefined,
          "data-selected": on ? "" : undefined,
          className: "",
        };
        const emoji: ListEmoji = { isActive: false, unified, names: [...(record?.shortcodes ?? []), record?.name ?? unified], emoji: record?.imageUrl ? unified : unifiedToNative(unified), isCustom: Boolean(record?.imageUrl), imageUrl: record?.imageUrl, hasVariations: Boolean(record?.tones.length) };
        const render = User ? (p: React.HTMLAttributes<HTMLElement>) => <User {...(p as Omit<EmojiCellProps, "emoji">)} emoji={emoji} /> : undefined;
        const glyph = <ReactionGlyph unified={unified} />;
        return on === undefined ? (
          <Button key={base} {...attrs} onPress={() => picker.pick(unified)} render={render as never}>
            {glyph}
          </Button>
        ) : (
          <ToggleButton key={base} {...attrs} isSelected={on} onChange={() => picker.pick(unified)} render={render as never}>
            {glyph}
          </ToggleButton>
        );
      })}
      {state.expand ? (
        <Button
          aria-label={labels.expandReactions}
          data-slot={SLOTS.reactionsExpand}
          className=""
          {...{ title: labels.expandReactions }}
          onPress={() => {
            expandFocus.current = true;
            state.expand!();
          }}
          render={Expand ? (p) => <Expand {...(p as React.ButtonHTMLAttributes<HTMLButtonElement>)} /> : undefined}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Button>
      ) : null}
    </ReactionBar>
  );
});

/** The full picker inside a Tapback: hidden while the reaction row shows. */
export const Panel = React.forwardRef<HTMLDivElement, Omit<React.HTMLAttributes<HTMLDivElement>, "hidden">>(function Panel(props, ref) {
  const state = React.useContext(ReactionsContext);
  const hidden = Boolean(state?.open);
  return <div data-slot={SLOTS.panel} {...props} ref={ref} hidden={hidden} inert={hidden || undefined} />;
});
