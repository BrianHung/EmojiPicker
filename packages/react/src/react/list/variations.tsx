import * as React from "react";
import type { EmojiRecord, SkinToneValue } from "@brianhung/emoji-picker-core";
import { nameWithTone, SKIN_TONE_VALUES } from "@brianhung/emoji-picker-core/internal";
import { usePicker, type Overlay } from "../root/context";
import { Glyph } from "../emoji/glyph";
import { FocusScope, useFocusManager } from "react-aria/FocusScope";
import { useLocale } from "react-aria/I18nProvider";
import { mergeRefs } from "react-aria/mergeRefs";
import { useInteractOutside } from "react-aria/useInteractOutside";
import { mergePartProps } from "../utils/events";
import { useInteraction } from "../utils/interaction";
import { hasModifier, moveFocus, usePickerKeyDown } from "../utils/keyboard";
import { flag, renderElement, resolve, type InteractionState, type PartElementProps } from "../utils/render";
import { SLOTS } from "../utils/slots";
import { useStore } from "../utils/store";
import { useLayoutEffect } from "../utils/utils";

export type VariationsState = { emoji: EmojiRecord; tone: SkinToneValue };

export type VariationsProps = Omit<PartElementProps<VariationsState, HTMLDivElement, "role">, "children"> & {
  children?: (tone: SkinToneValue) => React.ReactNode;
};

export type VariationsOptionState = InteractionState & { emoji: EmojiRecord; unified: string; tone: SkinToneValue; selected: boolean; highlighted: boolean };

export type VariationsOptionProps = PartElementProps<VariationsOptionState, HTMLDivElement, "role"> & {
  tone?: SkinToneValue;
};

const ROW: React.CSSProperties = { zIndex: 4, display: "flex", background: "var(--emoji-picker-background, Canvas)", borderRadius: "var(--emoji-picker-radius, 8px)", boxShadow: "var(--emoji-picker-shadow, 0 4px 12px rgb(0 0 0 / 0.15))" };
const OPTION: React.CSSProperties = { position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "var(--ep-cell)", height: "var(--ep-cell)", overflow: "hidden", cursor: "default" };

type Row = { record: EmojiRecord; current: SkinToneValue; pick(unified: string, event?: Event): void };
const RowContext = React.createContext<Row | null>(null);
const ToneContext = React.createContext<SkinToneValue>(0);

const unifiedOf = (record: EmojiRecord, tone: SkinToneValue) => (tone ? record.tones[tone - 1]! : record.unified);

// The popup a long press or Shift+Space opens on a cell; List renders one unless a List.Variations is in Root
export const VariationsPopup = React.forwardRef<HTMLDivElement, VariationsProps>(function VariationsPopup(props, ref) {
  const { state, list } = usePicker("EmojiPicker.List.Variations");
  useStore(state, (s) => s.variations);
  const overlay = list.current?.overlay();
  if (!overlay) return null;
  return (
    <FocusScope autoFocus>
      <VariationsRow {...props} overlay={overlay} ref={ref} />
    </FocusScope>
  );
});

const VariationsRow = React.forwardRef<HTMLDivElement, VariationsProps & { overlay: Overlay }>(function VariationsRow({ overlay, style, children, onKeyDown, ...props }, ref) {
  const { store, labels } = usePicker();
  const { record, close, pick } = overlay;
  const row = React.useRef<HTMLDivElement | null>(null);
  const focus = useFocusManager();
  const rtl = useLocale().direction === "rtl";
  const current = Math.max(0, [record.unified, ...record.tones].indexOf(store.withSkinTone(record.unified))) as SkinToneValue;
  const dismiss = () => close(false);
  useInteractOutside({ ref: row, onInteractOutsideStart: dismiss, onInteractOutside: dismiss });

  const keys = usePickerKeyDown(onKeyDown, (e) => {
    const unified = e.target instanceof HTMLElement ? e.target.dataset.unified : undefined;
    if (unified === undefined || hasModifier(e)) return false;
    if (e.key === "Escape") close(true);
    else if (e.key === "Enter" || (e.key === " " && !e.shiftKey)) pick(unified, e.nativeEvent);
    else return moveFocus(focus, e.key, rtl) || e.key === "ArrowUp" || e.key === "ArrowDown";
    return true;
  });
  const refs = React.useMemo(() => mergeRefs<HTMLDivElement>(row, ref), [ref]);
  return (
    <RowContext.Provider value={{ record, current, pick }}>
      {renderElement(
        "div",
        {
          role: "listbox",
          "aria-label": labels.skinTone,
          "aria-orientation": "horizontal",
          ...mergePartProps(props, { onBlur: (e: React.FocusEvent) => !e.currentTarget.contains(e.relatedTarget as Node | null) && close(false) }),
          ref: refs,
          onKeyDown: keys,
          "data-slot": SLOTS.variations,
          style: (s: VariationsState) => ({ ...ROW, ...overlay.style, ...resolve(style, s) }),
          children: SKIN_TONE_VALUES.slice(0, record.tones.length + 1).map((t) => (
            <ToneContext.Provider key={t} value={t}>
              {children ? children(t) : <VariationsOption />}
            </ToneContext.Provider>
          )),
        },
        { emoji: record, tone: current },
      )}
    </RowContext.Provider>
  );
});

const VariationsOption = React.forwardRef<HTMLDivElement, VariationsOptionProps>(function VariationsOption({ tone: toneProp, style, children, ...props }, ref) {
  const row = React.useContext(RowContext);
  const contextTone = React.useContext(ToneContext);
  const { labels } = usePicker("EmojiPicker.List.Variations.Option");
  // No usePress: it would take Enter and Space from the row's keys
  const interaction = useInteraction({ pressed: false });
  if (!row) throw new Error("EmojiPicker.List.Variations.Option must be inside List.Variations.");
  const tone = toneProp ?? contextTone;
  const unified = unifiedOf(row.record, tone);
  const selected = tone === row.current;
  const state: VariationsOptionState = { ...interaction.state, emoji: row.record, unified, tone, selected, highlighted: interaction.state.focused || interaction.state.hovered };
  return renderElement(
    "div",
    {
      role: "option",
      "aria-selected": selected,
      "aria-label": nameWithTone(row.record.name, unified, labels.withSkinTone),
      tabIndex: selected ? 0 : -1,
      ...mergePartProps(props, interaction.props, { onClick: (e: React.MouseEvent) => row.pick(unified, e.nativeEvent) }),
      ref,
      "data-slot": SLOTS.variation,
      "data-unified": unified,
      "data-selected": flag(selected),
      "data-highlighted": flag(state.highlighted),
      style: (s: VariationsOptionState) => ({ ...OPTION, ...resolve(style, s) }),
      children: children ?? <Glyph unified={unified} record={row.record} />,
    },
    state,
  );
});

const VariationsRoot = React.forwardRef<HTMLDivElement, VariationsProps>(function Variations(props, ref) {
  const { variations } = usePicker("EmojiPicker.List.Variations");
  const { register } = variations;
  useLayoutEffect(() => register(), [register]);
  return <VariationsPopup {...props} ref={ref} />;
});

export const Variations = /* @__PURE__ */ Object.assign(VariationsRoot, { Option: VariationsOption });
