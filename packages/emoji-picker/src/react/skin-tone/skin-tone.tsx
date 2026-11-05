// EmojiPicker.SkinTone: a trigger showing the shared tone, opening the six tones as a radio group.
// Not React Aria's RadioGroup: arrows there change the tone; here they move focus and a press picks.
import * as React from "react";
import { mergeRefs } from "react-aria/mergeRefs";
import { withTone } from "../../core/dataset";
import { nativeToUnified } from "../../core/resolve";
import { Emoji, type EmojiProps } from "../emoji/emoji";
import { useSkinTone } from "../provider/hooks";
import { useKeyRegion, useSkinToneToggle } from "../root/keyboard";
import type { KeyboardAction } from "../root/keymap";
import { useEmojiContext } from "../provider/provider";
import { renderElement, resolve, type PartElementProps } from "../utils/render";
import { SLOTS } from "../utils/slots";

const TONES = [0, 1, 2, 3, 4, 5] as const;
// Swatches for the unstyled default (Fitzpatrick palette, as emoji-picker-react).
const SWATCHES = ["#ffd225", "#ffdfbd", "#e9c197", "#c88e62", "#a86637", "#60463a"];
const swatch = (tone: number): React.CSSProperties => ({ width: "var(--emoji-skin-tone-size, 15px)", height: "var(--emoji-skin-tone-size, 15px)", borderRadius: "50%", background: SWATCHES[tone] });

type Orientation = "horizontal" | "vertical";
type SkinToneContextValue = { tone: number; open: boolean; orientation: Orientation; toggle(): void; choose(tone: number): void; label(tone: number): string; group: string };
const SkinToneContext = React.createContext<SkinToneContextValue | null>(null);
const OptionContext = React.createContext<number | null>(null);

function useSkinToneContext(part: string) {
  const value = React.useContext(SkinToneContext);
  if (!value) throw new Error(`EmojiPicker.SkinTone.${part} must be inside <EmojiPicker.SkinTone>.`);
  return value;
}

export type SkinToneState = { open: boolean; tone: number };

export type SkinToneProps = PartElementProps<SkinToneState> & {
  /** Axis the options open along. Default "horizontal". */
  orientation?: Orientation;
};

/** The shared skin tone (0, none, to 5): `SkinTone.Trigger` and `SkinTone.Options` by default. */
const SkinToneRoot = React.forwardRef<HTMLDivElement, SkinToneProps>(function SkinTone({ orientation = "horizontal", children, ...props }, ref) {
  const [tone, setTone] = useSkinTone();
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const options = () => [...(rootRef.current?.querySelectorAll<HTMLElement>(`[data-slot="${SLOTS.skinToneOption}"]`) ?? [])];

  React.useEffect(() => {
    if (!open) return;
    options()[tone]?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, tone]);

  const { labels } = useEmojiContext();
  // Closing from inside the options returns focus to the trigger, as a menu does.
  const close = React.useCallback(() => {
    const root = rootRef.current;
    const inside = root?.querySelector(`[data-slot="${SLOTS.skinToneOptions}"]`)?.contains(document.activeElement);
    setOpen(false);
    if (inside) root?.querySelector<HTMLElement>(`[data-slot="${SLOTS.skinToneTrigger}"]`)?.focus();
  }, []);
  const toggle = () => (open ? close() : setOpen(true));
  useSkinToneToggle(toggle);
  // Keys among the options: the keymap's moves along their axis (mirrored right to left), first/last, and close.
  const region = useKeyRegion((action, event) => {
    if (!open || !action) return "pass";
    if (action === "close") {
      close();
      return "handled";
    }
    const all = options();
    const i = all.indexOf(event.target as HTMLElement);
    if (i < 0) return "pass";
    const rtl = orientation === "horizontal" && rootRef.current != null && getComputedStyle(rootRef.current).direction === "rtl";
    const steps: Partial<Record<KeyboardAction, number>> = orientation === "vertical" ? { "move-down": 1, "move-up": -1 } : { "move-right": rtl ? -1 : 1, "move-left": rtl ? 1 : -1 };
    if (action === "first" || action === "last") all[action === "first" ? 0 : all.length - 1]?.focus();
    else if (steps[action]) all[(i + steps[action]! + all.length) % all.length]?.focus();
    else return "pass";
    return "handled";
  });

  const merged = React.useMemo(() => mergeRefs(ref, rootRef, region), [ref, region]);
  const context: SkinToneContextValue = {
    tone,
    open,
    orientation,
    toggle,
    choose(next) {
      setTone(next);
      close();
    },
    label: (i) => labels.skinTones[i]!,
    group: labels.skinTone,
  };
  return (
    <SkinToneContext.Provider value={context}>
      {renderElement("div", { ...props, ref: merged, "data-slot": SLOTS.skinTone, "data-state": open ? "open" : "closed", children: children ?? <><SkinToneTrigger /><SkinToneOptions /></> }, { open, tone })}
    </SkinToneContext.Provider>
  );
});

export type SkinToneTriggerProps = PartElementProps<SkinToneState, HTMLButtonElement, "onClick">;

/** Shows the current tone and opens the options. Without children, a color swatch. */
const SkinToneTrigger = React.forwardRef<HTMLButtonElement, SkinToneTriggerProps>(function SkinToneTrigger({ style, children, ...props }, ref) {
  const { tone, open, toggle, label } = useSkinToneContext("Trigger");
  const state = { open, tone };
  return renderElement(
    "button",
    {
      type: "button",
      ...props,
      ref,
      "data-slot": SLOTS.skinToneTrigger,
      "aria-label": label(tone),
      "aria-haspopup": "true",
      "aria-expanded": open,
      onClick: toggle,
      style: (s: SkinToneState) => (children === undefined ? { ...swatch(tone), ...resolve(style, s) } : resolve(style, s)),
      children,
    },
    state,
  );
});

export type SkinToneOptionsState = { orientation: Orientation; tone: number };

export type SkinToneOptionsProps = Omit<PartElementProps<SkinToneOptionsState>, "children" | "role"> & {
  /** Each tone's option, 0 (none) to 5. Default: `SkinTone.Option`. */
  children?: (tone: number) => React.ReactNode;
};

/** The six tones as a radio group, while open. */
const SkinToneOptions = React.forwardRef<HTMLDivElement, SkinToneOptionsProps>(function SkinToneOptions({ style, children, ...props }, ref) {
  const { open, orientation, group, tone } = useSkinToneContext("Options");
  if (!open) return null;
  return renderElement(
    "div",
    {
      ...props,
      ref,
      role: "radiogroup",
      "aria-label": group,
      "data-slot": SLOTS.skinToneOptions,
      "data-orientation": orientation,
      style: (s: SkinToneOptionsState) => ({ position: "absolute", ...(orientation === "vertical" ? { flexDirection: "column" } : null), ...resolve(style, s) }),
      children: TONES.map((t) => <OptionContext.Provider key={t} value={t}>{children ? children(t) : <SkinToneOption tone={t} />}</OptionContext.Provider>),
    },
    { orientation, tone },
  );
});

export type SkinToneOptionState = { tone: number; selected: boolean };

export type SkinToneOptionProps = PartElementProps<SkinToneOptionState, HTMLButtonElement, "onClick" | "role"> & {
  /** 0 (none) to 5. */
  tone: number;
};

/** One tone, as a radio. Without children, a color swatch. */
const SkinToneOption = React.forwardRef<HTMLButtonElement, SkinToneOptionProps>(function SkinToneOption({ tone, style, children, ...props }, ref) {
  const { tone: current, choose, label } = useSkinToneContext("Option");
  const selected = tone === current;
  return (
    <OptionContext.Provider value={tone}>
      {renderElement(
        "button",
        {
          type: "button",
          ...props,
          ref,
          role: "radio",
          "aria-checked": selected,
          "aria-label": label(tone),
          tabIndex: selected ? 0 : -1,
          "data-slot": SLOTS.skinToneOption,
          onClick: () => choose(tone),
          style: (s: SkinToneOptionState) => (children === undefined ? { ...swatch(tone), ...resolve(style, s) } : resolve(style, s)),
          children,
        },
        { tone, selected },
      )}
    </OptionContext.Provider>
  );
});

export type SkinToneGlyphProps = Omit<EmojiProps, "emoji"> & {
  /** The emoji to show in the tone, as text. Default ✋. */
  emoji?: string;
};

/** An emoji in the tone of the option it is in, else the current tone (Slack's and Discord's ✋). */
function SkinToneGlyph({ emoji = "✋", style, ...props }: SkinToneGlyphProps) {
  const { tone: current } = useSkinToneContext("Glyph");
  const tone = React.useContext(OptionContext) ?? current;
  const unified = nativeToUnified(emoji);
  return <Emoji {...props} emoji={tone > 0 ? withTone(unified, tone) : unified} style={{ width: "1em", height: "1em", ...style }} />;
}

export const SkinTone = /* @__PURE__ */ Object.assign(SkinToneRoot, { Trigger: SkinToneTrigger, Options: SkinToneOptions, Option: SkinToneOption, Glyph: SkinToneGlyph });
