// Not React Aria's RadioGroup: arrows there change the tone; here they move focus and a press picks
import * as React from "react";
import { FocusScope, useFocusManager } from "react-aria/FocusScope";
import { mergeRefs } from "react-aria/mergeRefs";
import { useInteractOutside } from "react-aria/useInteractOutside";
import { useOverlayTriggerState } from "react-stately/useOverlayTriggerState";
import { nativeToUnified, type SkinToneValue, withTone } from "@brianhung/emoji-picker-core";
import { Emoji, type EmojiProps } from "../emoji/emoji";
import { useSkinTone } from "../provider/hooks";
import { useKeyRegion, useSkinToneToggle } from "../root/keyboard";
import type { KeyboardAction } from "../root/keymap";
import { useEmojiContext } from "../provider/provider";
import { renderElement, resolve, type PartElementProps } from "../utils/render";
import { SLOTS } from "../utils/slots";

const TONES = [0, 1, 2, 3, 4, 5] as const;
const SWATCHES = ["#ffd225", "#ffdfbd", "#e9c197", "#c88e62", "#a86637", "#60463a"];
const swatch = (tone: number): React.CSSProperties => ({ width: "var(--emoji-skin-tone-size, 15px)", height: "var(--emoji-skin-tone-size, 15px)", borderRadius: "50%", background: SWATCHES[tone] });

type Orientation = "horizontal" | "vertical";
type SkinToneContextValue = {
  tone: SkinToneValue;
  open: boolean;
  orientation: Orientation;
  toggle(): void;
  choose(tone: SkinToneValue): void;
  label(tone: SkinToneValue): string;
  group: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  optionsRef: React.RefObject<HTMLDivElement | null>;
};
const SkinToneContext = React.createContext<SkinToneContextValue | null>(null);
const OptionContext = React.createContext<SkinToneValue | null>(null);

function useSkinToneContext(part: string) {
  const value = React.useContext(SkinToneContext);
  if (!value) throw new Error(`EmojiPicker.SkinTone.${part} must be inside <EmojiPicker.SkinTone>.`);
  return value;
}

export type SkinToneState = { open: boolean; tone: SkinToneValue };

export type SkinToneProps = PartElementProps<SkinToneState> & {
  orientation?: Orientation;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const SkinToneRoot = React.forwardRef<HTMLDivElement, SkinToneProps>(function SkinTone({ orientation = "horizontal", open: openProp, defaultOpen = false, onOpenChange, children, ...props }, ref) {
  const [tone, setTone] = useSkinTone();
  const state = useOverlayTriggerState({ isOpen: openProp, defaultOpen, onOpenChange });
  const open = state.isOpen;
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const optionsRef = React.useRef<HTMLDivElement | null>(null);
  useInteractOutside({ ref: rootRef, isDisabled: !open, onInteractOutsideStart: state.close, onInteractOutside: state.close });

  const { labels } = useEmojiContext();
  const close = React.useCallback(() => {
    const inside = optionsRef.current?.contains(document.activeElement);
    state.close();
    if (inside) triggerRef.current?.focus();
  }, [state.close]);
  const toggle = () => (open ? close() : state.open());
  useSkinToneToggle(toggle);
  const region = useKeyRegion((action) => {
    if (!open || action !== "close") return "pass";
    close();
    return "handled";
  });

  const merged = React.useMemo(() => mergeRefs<HTMLDivElement>(ref, rootRef, region), [ref, region]);
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
    triggerRef,
    optionsRef,
  };
  return (
    <SkinToneContext.Provider value={context}>
      {renderElement(
        "div",
        {
          ...props,
          ref: merged,
          "data-slot": SLOTS.skinTone,
          "data-state": open ? "open" : "closed",
          children: children ?? (
            <>
              <SkinToneTrigger />
              <SkinToneOptions />
            </>
          ),
        },
        { open, tone },
      )}
    </SkinToneContext.Provider>
  );
});

export type SkinToneTriggerProps = PartElementProps<SkinToneState, HTMLButtonElement, "onClick">;

const SkinToneTrigger = React.forwardRef<HTMLButtonElement, SkinToneTriggerProps>(function SkinToneTrigger({ style, children, ...props }, ref) {
  const { tone, open, toggle, label, triggerRef } = useSkinToneContext("Trigger");
  const state = { open, tone };
  const refs = React.useMemo(() => mergeRefs<HTMLButtonElement>(ref, triggerRef), [ref, triggerRef]);
  return renderElement(
    "button",
    {
      type: "button",
      ...props,
      ref: refs,
      "data-slot": SLOTS.skinToneTrigger,
      "aria-label": label(tone),
      "aria-haspopup": "true",
      "aria-expanded": open,
      "data-state": open ? "open" : "closed",
      onClick: toggle,
      style: (s: SkinToneState) => (children === undefined ? { ...swatch(tone), ...resolve(style, s) } : resolve(style, s)),
      children,
    },
    state,
  );
});

export type SkinToneOptionsState = { orientation: Orientation; tone: SkinToneValue };

export type SkinToneOptionsProps = Omit<PartElementProps<SkinToneOptionsState>, "children" | "role"> & {
  children?: (tone: SkinToneValue) => React.ReactNode;
};

const SkinToneOptions = React.forwardRef<HTMLDivElement, SkinToneOptionsProps>(function SkinToneOptions(props, ref) {
  const { open } = useSkinToneContext("Options");
  if (!open) return null;
  return (
    <FocusScope autoFocus>
      <SkinToneGroup {...props} ref={ref} />
    </FocusScope>
  );
});

const SkinToneGroup = React.forwardRef<HTMLDivElement, SkinToneOptionsProps>(function SkinToneGroup({ style, children, ...props }, ref) {
  const { orientation, group, tone, optionsRef } = useSkinToneContext("Options");
  const focus = useFocusManager();
  const region = useKeyRegion((action) => {
    const rtl = orientation === "horizontal" && optionsRef.current != null && getComputedStyle(optionsRef.current).direction === "rtl";
    const steps: Partial<Record<KeyboardAction, number>> = orientation === "vertical" ? { "move-down": 1, "move-up": -1 } : { "move-right": rtl ? -1 : 1, "move-left": rtl ? 1 : -1 };
    const step = action ? steps[action] : undefined;
    if (action === "first") focus?.focusFirst();
    else if (action === "last") focus?.focusLast();
    else if (step) step > 0 ? focus?.focusNext({ wrap: true }) : focus?.focusPrevious({ wrap: true });
    else return "pass";
    return "handled";
  });
  const refs = React.useMemo(() => mergeRefs<HTMLDivElement>(ref, optionsRef, region), [ref, optionsRef, region]);
  return renderElement(
    "div",
    {
      ...props,
      ref: refs,
      role: "radiogroup",
      "aria-label": group,
      "data-slot": SLOTS.skinToneOptions,
      "data-orientation": orientation,
      style: (s: SkinToneOptionsState) => ({ position: "absolute", ...(orientation === "vertical" ? { flexDirection: "column" } : null), ...resolve(style, s) }),
      children: TONES.map((t) => (
        <OptionContext.Provider key={t} value={t}>
          {children ? children(t) : <SkinToneOption tone={t} />}
        </OptionContext.Provider>
      )),
    },
    { orientation, tone },
  );
});

export type SkinToneOptionState = { tone: SkinToneValue; selected: boolean };

export type SkinToneOptionProps = PartElementProps<SkinToneOptionState, HTMLButtonElement, "onClick" | "role"> & {
  tone: SkinToneValue;
};

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
          "data-selected": selected || undefined,
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
  emoji?: string;
};

function SkinToneGlyph({ emoji = "✋", style, ...props }: SkinToneGlyphProps) {
  const { tone: current } = useSkinToneContext("Glyph");
  const tone = React.useContext(OptionContext) ?? current;
  const unified = nativeToUnified(emoji);
  return <Emoji {...props} emoji={tone > 0 ? withTone(unified, tone) : unified} style={{ width: "1em", height: "1em", ...style }} />;
}

export const SkinTone = /* @__PURE__ */ Object.assign(SkinToneRoot, { Trigger: SkinToneTrigger, Options: SkinToneOptions, Option: SkinToneOption, Glyph: SkinToneGlyph });
