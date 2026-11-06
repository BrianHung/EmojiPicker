// A toolbar of toggle buttons, as Base UI's ToggleGroup, not radios: the arrows move focus without checking, and a press picks
import * as React from "react";
import { FocusScope, useFocusManager } from "react-aria/FocusScope";
import { useLocale } from "react-aria/I18nProvider";
import { mergeRefs } from "react-aria/mergeRefs";
import { useInteractOutside } from "react-aria/useInteractOutside";

import { type ChangeDetails, nativeToUnified, type SkinToneValue, withTone } from "@brianhung/emoji-picker-core";
import { useChangeState } from "../utils/state";
import { Emoji, type EmojiProps } from "../emoji/emoji";
import { useSkinTone } from "../provider/hooks";
import { PickerContext } from "../root/context";
import { mergePartProps } from "../utils/events";
import { moveFocus, usePickerKeyDown } from "../utils/keyboard";
import { useEmojiContext } from "../provider/provider";
import { flag, renderElement, resolve, type InteractionState, type Orientation, type PartElementProps } from "../utils/render";
import { useInteraction } from "../utils/interaction";
import { SLOTS } from "../utils/slots";

const TONES = [0, 1, 2, 3, 4, 5] as const;
const SWATCHES = ["#ffd225", "#ffdfbd", "#e9c197", "#c88e62", "#a86637", "#60463a"];
const swatch = (tone: number): React.CSSProperties => ({ width: "var(--emoji-skin-tone-size, 15px)", height: "var(--emoji-skin-tone-size, 15px)", borderRadius: "50%", background: SWATCHES[tone] });

type SkinToneContextValue = {
  tone: SkinToneValue;
  open: boolean;
  orientation: Orientation;
  toggle(event?: Event): void;
  choose(tone: SkinToneValue, event?: Event): void;
  label(tone: SkinToneValue): string;
  group: string;
  optionsId: string;
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
  onOpenChange?: (open: boolean, details: SkinToneOpenChangeDetails) => void;
};

export type SkinToneOpenChangeDetails = ChangeDetails<"trigger-press" | "outside-press" | "escape-key" | "item-press" | "focus-out" | "imperative-action" | "none">;
type OpenReason = SkinToneOpenChangeDetails["reason"];

const SkinToneRoot = React.forwardRef<HTMLDivElement, SkinToneProps>(function SkinTone({ orientation = "horizontal", open: openProp, defaultOpen = false, onOpenChange, onKeyDown, children, ...props }, ref) {
  const [tone, setTone] = useSkinTone();
  const [open, setOpen] = useChangeState(openProp, defaultOpen, onOpenChange);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const optionsRef = React.useRef<HTMLDivElement | null>(null);
  const outside = (event: PointerEvent) => setOpen(false, "outside-press", event);
  useInteractOutside({ ref: rootRef, isDisabled: !open, onInteractOutsideStart: outside, onInteractOutside: outside });

  const { labels } = useEmojiContext();
  const optionsId = React.useId();
  const close = (reason: OpenReason, event?: Event) => {
    const inside = optionsRef.current?.contains(document.activeElement);
    const details = setOpen(false, reason, event);
    if (inside && details && !details.isCanceled) triggerRef.current?.focus();
    return details;
  };
  const toggle = (event?: Event) => (open ? close(event ? "trigger-press" : "imperative-action", event) : setOpen(true, event ? "trigger-press" : "imperative-action", event));
  const toggles = React.useContext(PickerContext)?.skinTone;
  const latest = React.useRef(toggle);
  latest.current = toggle;
  React.useEffect(() => {
    if (!toggles) return;
    const fn = () => latest.current();
    toggles.current = fn;
    return () => {
      if (toggles.current === fn) toggles.current = null;
    };
  }, [toggles]);
  const keys = usePickerKeyDown(onKeyDown, (e) => {
    if (!open || e.key !== "Escape") return false;
    return !close("escape-key", e.nativeEvent)?.isPropagationAllowed;
  });
  // Focus that leaves for the page closes the options, as it does the variations
  const onBlur = (e: React.FocusEvent) => open && !rootRef.current?.contains(e.relatedTarget as Node | null) && setOpen(false, "focus-out", e.nativeEvent);

  const merged = React.useMemo(() => mergeRefs<HTMLDivElement>(ref, rootRef), [ref]);
  const context: SkinToneContextValue = {
    tone,
    open,
    orientation,
    toggle,
    choose(next, event) {
      setTone(next, { reason: "item-press", event });
      close("item-press", event);
    },
    label: (i) => labels.skinTones[i]!,
    group: labels.skinTone,
    optionsId,
    triggerRef,
    optionsRef,
  };
  return (
    <SkinToneContext.Provider value={context}>
      {renderElement(
        "div",
        {
          ...mergePartProps(props, { onBlur }),
          onKeyDown: keys,
          ref: merged,
          "data-slot": SLOTS.skinTone,
          "data-open": flag(open),
          "data-closed": flag(!open),
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

export type SkinToneTriggerState = SkinToneState & InteractionState;

export type SkinToneTriggerProps = PartElementProps<SkinToneTriggerState, HTMLButtonElement>;

const SkinToneTrigger = React.forwardRef<HTMLButtonElement, SkinToneTriggerProps>(function SkinToneTrigger({ style, children, ...props }, ref) {
  const { tone, open, toggle, label, triggerRef, optionsId } = useSkinToneContext("Trigger");
  const interaction = useInteraction();
  const state: SkinToneTriggerState = { open, tone, ...interaction.state };
  const refs = React.useMemo(() => mergeRefs<HTMLButtonElement>(ref, triggerRef), [ref, triggerRef]);
  return renderElement(
    "button",
    {
      type: "button",
      ...mergePartProps(props, { onClick: (e: React.MouseEvent) => toggle(e.nativeEvent) }, interaction.props),
      ref: refs,
      "data-slot": SLOTS.skinToneTrigger,
      "aria-label": label(tone),
      "aria-expanded": open,
      "aria-controls": open ? optionsId : undefined,
      "data-popup-open": flag(open),
      style: (s: SkinToneTriggerState) => (children === undefined ? { ...swatch(tone), ...resolve(style, s) } : resolve(style, s)),
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

const SkinToneGroup = React.forwardRef<HTMLDivElement, SkinToneOptionsProps>(function SkinToneGroup({ style, children, onKeyDown, ...props }, ref) {
  const { orientation, group, tone, optionsRef, optionsId } = useSkinToneContext("Options");
  const focus = useFocusManager();
  const rtl = useLocale().direction === "rtl" && orientation === "horizontal";
  const keys = usePickerKeyDown(onKeyDown, (e) => !e.altKey && !e.metaKey && moveFocus(focus, e.key, rtl, orientation === "vertical"));
  const refs = React.useMemo(() => mergeRefs<HTMLDivElement>(ref, optionsRef), [ref, optionsRef]);
  return renderElement(
    "div",
    {
      id: optionsId,
      role: "toolbar",
      "aria-label": group,
      "aria-orientation": orientation,
      ...props,
      onKeyDown: keys,
      ref: refs,
      "data-slot": SLOTS.skinToneOptions,
      "data-orientation": orientation,
      style: (s: SkinToneOptionsState) => ({ position: "absolute", zIndex: 4, background: "var(--emoji-picker-background, Canvas)", ...(orientation === "vertical" ? { flexDirection: "column" } : null), ...resolve(style, s) }),
      children: TONES.map((t) => (
        <OptionContext.Provider key={t} value={t}>
          {children ? children(t) : <SkinToneOption tone={t} />}
        </OptionContext.Provider>
      )),
    },
    { orientation, tone },
  );
});

export type SkinToneOptionState = InteractionState & { tone: SkinToneValue; selected: boolean };

export type SkinToneOptionProps = PartElementProps<SkinToneOptionState, HTMLButtonElement, "role"> & {
  tone?: SkinToneValue;
};

const SkinToneOption = React.forwardRef<HTMLButtonElement, SkinToneOptionProps>(function SkinToneOption({ tone: toneProp, style, children, ...props }, ref) {
  const { tone: current, choose, label } = useSkinToneContext("Option");
  const fromOptions = React.useContext(OptionContext);
  const tone = toneProp ?? fromOptions ?? 0;
  const interaction = useInteraction();
  const selected = tone === current;
  return (
    <OptionContext.Provider value={tone}>
      {renderElement(
        "button",
        {
          type: "button",
          "aria-label": label(tone),
          "aria-pressed": selected,
          ...mergePartProps(props, interaction.props, { onClick: (e: React.MouseEvent) => choose(tone, e.nativeEvent) }),
          ref,
          tabIndex: selected ? 0 : -1,
          "data-slot": SLOTS.skinToneOption,
          "data-selected": flag(selected),
          style: (s: SkinToneOptionState) => (children === undefined ? { ...swatch(tone), ...resolve(style, s) } : resolve(style, s)),
          children,
        },
        { ...interaction.state, tone, selected },
      )}
    </OptionContext.Provider>
  );
});

export type SkinToneGlyphProps = Omit<EmojiProps, "emoji"> & {
  emoji?: string;
};

function SkinToneGlyph({ emoji = "✋", ...props }: SkinToneGlyphProps) {
  const { tone: current } = useSkinToneContext("Glyph");
  const tone = React.useContext(OptionContext) ?? current;
  const unified = nativeToUnified(emoji);
  return <Emoji {...props} emoji={tone > 0 ? withTone(unified, tone) : unified} />;
}

export const SkinTone = /* @__PURE__ */ Object.assign(SkinToneRoot, { Trigger: SkinToneTrigger, Options: SkinToneOptions, Option: SkinToneOption, Glyph: SkinToneGlyph });

export declare namespace SkinTone {
  type Props = SkinToneProps;
  type State = SkinToneState;
  type OpenChangeDetails = SkinToneOpenChangeDetails;
  namespace Trigger {
    type Props = SkinToneTriggerProps;
    type State = SkinToneTriggerState;
  }
  namespace Options {
    type Props = SkinToneOptionsProps;
    type State = SkinToneOptionsState;
  }
  namespace Option {
    type Props = SkinToneOptionProps;
    type State = SkinToneOptionState;
  }
  namespace Glyph {
    type Props = SkinToneGlyphProps;
  }
}
