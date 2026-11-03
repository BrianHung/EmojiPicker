import * as React from "react";
import type { SkinToneButtonRenderProps } from "emoji-picker-react/primitives";
import { SKIN_TONES, withTone } from "../core/dataset";
import { Emoji } from "./emoji";
import { useSkinTone } from "./hooks";
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
      <Emoji unified={toned} style={{ width: "1em", height: "1em" }} />
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
  const choose = (i: number) => {
    setTone(i);
    setOpen(false);
  };
  // No aria-orientation on the group: the engine gives [aria-orientation=horizontal] contain:inline-size.
  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const next = orientation === "vertical" ? ["ArrowDown", "ArrowUp"] : ["ArrowRight", "ArrowLeft"];
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === next[0] || e.key === next[1]) {
      e.preventDefault();
      focusOption((i + (e.key === next[0] ? 1 : 5)) % 6);
    }
  };

  return (
    <div
      {...props}
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
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
              onKeyDown={(e: React.KeyboardEvent) => onKeyDown(e, i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
});
