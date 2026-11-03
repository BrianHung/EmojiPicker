import * as React from "react";
import type { SkinToneButtonRenderProps } from "emoji-picker-react/primitives";
import { SKIN_TONES, withTone } from "../core/dataset";
import { Emoji } from "./emoji";
import { useSkinTone } from "./hooks";
import { mergeRefs, useKeyRegion, useSkinToneToggle } from "./keyboard";
import type { KeyboardAction } from "./keymap";
import { SLOTS } from "./slots";

const TONE_IDS = ["neutral", ...SKIN_TONES] as const;
const TONE_LABELS = ["Default skin tone", "Light skin tone", "Medium-light skin tone", "Medium skin tone", "Medium-dark skin tone", "Dark skin tone"];
// Swatches for the unstyled default button (Fitzpatrick palette, as emoji-picker-react).
const SWATCHES = ["#ffd225", "#ffdfbd", "#e9c197", "#c88e62", "#a86637", "#60463a"];

export type SkinToneButtonProps = SkinToneButtonRenderProps;

/** Pass `components={{ SkinToneButton }}` to Root, or `button` here. */
const SkinToneButtonContext = React.createContext<React.ComponentType<SkinToneButtonProps> | undefined>(undefined);
export const SkinToneButtonProvider = SkinToneButtonContext.Provider;

function DefaultToneButton({ tone, style, ...props }: SkinToneButtonProps) {
  const index = TONE_IDS.indexOf(tone.skinTone as (typeof TONE_IDS)[number]);
  return (
    <button
      {...props}
      style={{ width: "var(--emoji-skin-tone-size, 15px)", height: "var(--emoji-skin-tone-size, 15px)", borderRadius: "50%", background: SWATCHES[index], ...style }}
    />
  );
}

/** The tone-applied emoji as a button (Slack's and Discord's ✋). */
function EmojiToneButton({ tone, emoji = "270b", ...props }: SkinToneButtonProps & { emoji?: string }) {
  const index = TONE_IDS.indexOf(tone.skinTone as (typeof TONE_IDS)[number]);
  const toned = index > 0 ? withTone(emoji, index) : emoji;
  return (
    <button {...props}>
      <Emoji emoji={toned} style={{ width: "1em", height: "1em" }} />
    </button>
  );
}

/** Adds `buttonClassName` (and the emoji for EmojiToneButton) to whichever button renders. */
function withButtonProps(Base: React.ComponentType<SkinToneButtonProps & { emoji?: string }>, emoji: string | undefined, className: string | undefined) {
  const own = Base === EmojiToneButton;
  if (!own && !className) return Base as React.ComponentType<SkinToneButtonProps>;
  return function ToneButton(props: SkinToneButtonProps) {
    // Only the built-in emoji button takes `emoji`; custom buttons spread props onto the DOM.
    return <Base {...props} {...(own ? { emoji } : {})} className={[className, props.className].filter(Boolean).join(" ") || undefined} />;
  };
}

export type SkinToneProps = Omit<React.HTMLAttributes<HTMLDivElement>, "children"> & {
  /**
   * Draw each option as this emoji in that tone ("270b" ✋, like Slack and Discord)
   * instead of a color swatch.
   */
  emoji?: string;
  /** Classes for the trigger and every option (`data-slot="skin-tone-option"`). */
  buttonClassName?: string;
  /** Axis the options open along. Default "horizontal". */
  orientation?: "horizontal" | "vertical";
  /** Classes for the open options list (`data-slot="skin-tone-options"`). */
  optionsClassName?: string;
  button?: React.ComponentType<SkinToneButtonProps>;
};

/**
 * The shared skin tone: one button showing the current tone, opening the six
 * options. Ours, not the engine's fan, so its size is whatever its button is.
 */
export const SkinTone = React.forwardRef<HTMLDivElement, SkinToneProps>(function SkinTone(
  { orientation = "horizontal", optionsClassName, button, emoji, buttonClassName, ...props },
  ref,
) {
  const [tone, setTone] = useSkinTone();
  const [open, setOpen] = React.useState(false);
  const fromRoot = React.useContext(SkinToneButtonContext);
  const Base = button ?? fromRoot ?? (emoji ? EmojiToneButton : DefaultToneButton);
  const Button = React.useMemo(() => withButtonProps(Base, emoji, buttonClassName), [Base, emoji, buttonClassName]);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  // Through the DOM, not refs: custom buttons may not forward refs (React 18).
  const focusOption = (i: number) => rootRef.current?.querySelectorAll<HTMLElement>(`[data-slot="${SLOTS.skinToneOption}"]`)[i]?.focus();

  React.useEffect(() => {
    if (!open) return;
    focusOption(tone);
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, tone]);

  const label = (i: number) => TONE_LABELS[i]!;
  // Closing from inside the options returns focus to the button, as a menu does.
  const close = React.useCallback(() => {
    const root = rootRef.current;
    const inside = root?.querySelector(`[data-slot="${SLOTS.skinToneOptions}"]`)?.contains(document.activeElement);
    setOpen(false);
    if (inside) root?.querySelector<HTMLElement>("button")?.focus();
  }, []);
  const choose = (i: number) => {
    setTone(i);
    close();
  };
  useSkinToneToggle(() => (open ? close() : setOpen(true)));

  // Keys among the options: the keymap's moves along their axis (mirrored right to
  // left), first/last, and close.
  const region = useKeyRegion((action, event) => {
    if (!open || !action) return "pass";
    if (action === "close") {
      close();
      return "handled";
    }
    const options = [...(rootRef.current?.querySelectorAll<HTMLElement>(`[data-slot="${SLOTS.skinToneOption}"]`) ?? [])];
    const i = options.indexOf(event.target as HTMLElement);
    if (i < 0) return "pass";
    const rtl = orientation === "horizontal" && rootRef.current != null && getComputedStyle(rootRef.current).direction === "rtl";
    const steps: Partial<Record<KeyboardAction, number>> =
      orientation === "vertical" ? { "move-down": 1, "move-up": -1 } : { "move-right": rtl ? -1 : 1, "move-left": rtl ? 1 : -1 };
    if (action === "first" || action === "last") focusOption(action === "first" ? 0 : options.length - 1);
    else if (steps[action]) focusOption((i + steps[action]! + options.length) % options.length);
    else return "pass";
    return "handled";
  });

  const merged = React.useMemo(() => mergeRefs(ref, rootRef, region), [ref, region]);
  return (
    <div
      {...props}
      ref={merged}
      data-slot={SLOTS.skinTone}
      data-state={open ? "open" : "closed"}
    >
      <Button
        type="button"
        tone={{ skinTone: TONE_IDS[tone] as SkinToneButtonProps["tone"]["skinTone"], isActive: true, isOpen: open }}
        aria-label={label(tone)}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      />
      {/* No aria-orientation on the group: the engine gives [aria-orientation=horizontal] contain:inline-size. */}
      {open ? (
        <div role="radiogroup" aria-label="Skin tone" data-slot={SLOTS.skinToneOptions} data-orientation={orientation} className={optionsClassName} style={orientation === "vertical" ? { flexDirection: "column" } : undefined}>
          {TONE_IDS.map((id, i) => (
            <Button
              key={id}
              type="button"
              role="radio"
              aria-checked={i === tone}
              aria-label={label(i)}
              tabIndex={i === tone ? 0 : -1}
              data-slot={SLOTS.skinToneOption}
              tone={{ skinTone: id as SkinToneButtonProps["tone"]["skinTone"], isActive: i === tone, isOpen: true }}
              onClick={() => choose(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
});
