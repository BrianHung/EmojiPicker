// A single-select toggle group, not RadioGroup: arrows there change the tone; here they move focus and a press picks
import * as React from "react";
import type { Orientation } from "@react-types/shared";
import { FocusScope, useFocusManager } from "react-aria/FocusScope";
import { useLocale } from "react-aria/I18nProvider";
import { mergeProps } from "react-aria/mergeProps";
import { mergeRefs } from "react-aria/mergeRefs";
import { useInteractOutside } from "react-aria/useInteractOutside";
import { useObjectRef } from "react-aria/useObjectRef";
import { useToggleButtonGroup, useToggleButtonGroupItem } from "react-aria/useToggleButtonGroup";
import { useOverlayTriggerState } from "react-stately/useOverlayTriggerState";
import type { ToggleGroupState } from "react-stately/useToggleGroupState";
import { nativeToUnified, type SkinToneValue, withTone } from "@brianhung/emoji-picker-core";
import { Emoji, type EmojiProps } from "../emoji/emoji";
import { useSkinTone } from "../provider/hooks";
import { PickerContext } from "../root/context";
import { moveFocus, usePickerKeyDown } from "../utils/keyboard";
import { useEmojiContext } from "../provider/provider";
import { renderElement, resolve, type PartElementProps } from "../utils/render";
import { SLOTS } from "../utils/slots";

const TONES = [0, 1, 2, 3, 4, 5] as const;
const noop = () => {};
const SWATCHES = ["#ffd225", "#ffdfbd", "#e9c197", "#c88e62", "#a86637", "#60463a"];
const swatch = (tone: number): React.CSSProperties => ({ width: "var(--emoji-skin-tone-size, 15px)", height: "var(--emoji-skin-tone-size, 15px)", borderRadius: "50%", background: SWATCHES[tone] });

type SkinToneContextValue = {
  tone: SkinToneValue;
  selection: ToggleGroupState;
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
  // The store owns the tone and a press picks it, so the group only reads it
  const selection: ToggleGroupState = { selectionMode: "single", isDisabled: false, selectedKeys: new Set([tone]), toggleKey: noop, setSelected: noop, setSelectedKeys: noop };
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
  const keys = usePickerKeyDown(undefined, (e) => {
    if (!open || e.key !== "Escape") return false;
    close();
    return true;
  });

  const merged = React.useMemo(() => mergeRefs<HTMLDivElement>(ref, rootRef), [ref]);
  const context: SkinToneContextValue = {
    tone,
    selection,
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
          ...mergeProps(props, { onKeyDown: keys }),
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
  const { orientation, group, tone, selection, optionsRef } = useSkinToneContext("Options");
  const focus = useFocusManager();
  const { groupProps } = useToggleButtonGroup({ orientation, "aria-label": group }, selection, optionsRef);
  const rtl = useLocale().direction === "rtl" && orientation === "horizontal";
  const keys = usePickerKeyDown(undefined, (e) => !e.altKey && !e.metaKey && moveFocus(focus, e.key, rtl, orientation === "vertical"));
  const refs = React.useMemo(() => mergeRefs<HTMLDivElement>(ref, optionsRef), [ref, optionsRef]);
  return renderElement(
    "div",
    {
      ...mergeProps(props, groupProps, { onKeyDown: keys }),
      ref: refs,
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

const SkinToneOption = React.forwardRef<HTMLButtonElement, SkinToneOptionProps>(function SkinToneOption({ tone, style, children, ...props }, forwarded) {
  const { tone: current, selection, choose, label } = useSkinToneContext("Option");
  const ref = useObjectRef(forwarded);
  const { buttonProps } = useToggleButtonGroupItem({ id: tone, "aria-label": label(tone), onPress: () => choose(tone) }, selection, ref);
  const selected = tone === current;
  return (
    <OptionContext.Provider value={tone}>
      {renderElement(
        "button",
        {
          ...mergeProps(props, buttonProps),
          ref,
          tabIndex: selected ? 0 : -1,
          "data-slot": SLOTS.skinToneOption,
          "data-selected": selected || undefined,
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
