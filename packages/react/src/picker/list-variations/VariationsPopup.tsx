"use client";

import * as React from "react";
import type { SkinToneValue } from "@emoji-components/core";
import { SKIN_TONE_VALUES } from "@emoji-components/core/internal";
import { useEmojiPickerRootContext, type Overlay } from "../root/EmojiPickerRootContext";
import { useLocale } from "react-aria/I18nProvider";
import { ListKeyboardDelegate } from "react-aria/ListKeyboardDelegate";
import { useCollator } from "react-aria/useCollator";
import { useListBox } from "react-aria/useListBox";
import { useInteractOutside } from "react-aria/useInteractOutside";
import { useObjectRef } from "react-aria/useObjectRef";
import { mergePartProps } from "../../internals/mergePartProps";
import { hasModifier, usePickerKeyDown } from "../../internals/usePickerKeyDown";
import { renderElement, resolve } from "../../internals/renderElement";
import { SLOTS } from "../../internals/slots";
import { useLayoutEffect } from "../../utils/useLayoutEffect";
import { useStore } from "../../utils/useStore";
import { Item } from "react-stately/Item";
import { useListState } from "react-stately/useListState";

import { EmojiPickerListVariationsOption } from "../list-variations-option/EmojiPickerListVariationsOption";
import type { EmojiPickerListVariationsProps, EmojiPickerListVariationsState } from "./EmojiPickerListVariations";
import { EmojiPickerListVariationsContext, EmojiPickerListVariationsToneContext } from "./EmojiPickerListVariationsContext";

const ROW: React.CSSProperties = { zIndex: 4, display: "flex", background: "var(--emoji-picker-background, Canvas)", borderRadius: "var(--emoji-picker-radius, 8px)", boxShadow: "var(--emoji-picker-shadow, 0 4px 12px rgb(0 0 0 / 0.15))" };

// The popup a long press or Shift+Space opens on a cell; List renders one unless a ListVariations is in Root
export const VariationsPopup = React.forwardRef<HTMLDivElement, EmojiPickerListVariationsProps>(function VariationsPopup(props, ref) {
  const { state, list } = useEmojiPickerRootContext("EmojiPicker.ListVariations");
  const open = useStore(state, (s) => s.variations);
  const [overlay, setOverlay] = React.useState<Overlay | null>(null);
  useLayoutEffect(() => setOverlay(open == null ? null : (list.current?.overlay() ?? null)), [open, list]);
  if (!overlay) return null;
  return <VariationsRow {...props} key={overlay.record.unified} overlay={overlay} ref={ref} />;
});

// React Aria's useListBox rather than RAC ListBox, which would join Root's Autocomplete as its collection
const VariationsRow = React.forwardRef<HTMLDivElement, EmojiPickerListVariationsProps & { overlay: Overlay }>(function VariationsRow({ overlay, style, children, onKeyDown, ...props }, ref) {
  const { store, labels } = useEmojiPickerRootContext();
  const { record, close, pick } = overlay;
  const row = useObjectRef(ref);
  const items = React.useMemo(() => [record.unified, ...record.tones].map((unified, i) => ({ tone: SKIN_TONE_VALUES[i]!, unified })), [record]);
  const current = Math.max(
    0,
    items.findIndex((item) => item.unified === store.withSkinTone(record.unified)),
  ) as SkinToneValue;
  const option = React.useCallback((item: (typeof items)[number]) => <Item key={item.unified}>{labels.skinTones[item.tone]}</Item>, [labels]);
  const listState = useListState({ items, children: option, selectionMode: "none" });
  const { direction } = useLocale();
  const collator = useCollator({ usage: "search", sensitivity: "base" });
  const delegate = React.useMemo(() => new ListKeyboardDelegate({ collection: listState.collection, ref: row, collator, orientation: "horizontal", direction }), [listState.collection, row, collator, direction]);
  const { listBoxProps } = useListBox({ "aria-label": props["aria-label"] ?? labels.skinTone, "aria-labelledby": props["aria-labelledby"], orientation: "horizontal", keyboardDelegate: delegate, shouldFocusWrap: true }, listState, row);
  // biome-ignore lint/correctness/useExhaustiveDependencies: focus the current tone once, on open
  useLayoutEffect(() => {
    listState.selectionManager.setFocused(true);
    listState.selectionManager.setFocusedKey(items[current]!.unified);
  }, []);
  const dismiss = () => close(false);
  useInteractOutside({ ref: row, onInteractOutside: dismiss });

  const keys = usePickerKeyDown(undefined, (e) => {
    const unified = e.target instanceof HTMLElement ? e.target.dataset.unified : undefined;
    if (unified === undefined || hasModifier(e)) return false;
    if (e.key === "Escape") close(true);
    else if (e.key === "Enter" || (e.key === " " && !e.shiftKey)) pick(unified, e.nativeEvent);
    else return false;
    return true;
  });
  return (
    <EmojiPickerListVariationsContext.Provider value={{ record, current, pick, list: listState }}>
      {renderElement(
        "div",
        {
          ...mergePartProps({ ...props, onKeyDown }, listBoxProps, { onKeyDown: keys, onBlur: (e: React.FocusEvent) => !e.currentTarget.contains(e.relatedTarget as Node | null) && close(false) }),
          ref: row,
          "data-slot": SLOTS.listVariations,
          style: (s: EmojiPickerListVariationsState) => ({ ...ROW, ...overlay.style, ...resolve(style, s) }),
          children: items.map(({ tone }) => (
            <EmojiPickerListVariationsToneContext.Provider key={tone} value={tone}>
              {children ? children(tone) : <EmojiPickerListVariationsOption />}
            </EmojiPickerListVariationsToneContext.Provider>
          )),
        },
        { emoji: record, tone: current },
      )}
    </EmojiPickerListVariationsContext.Provider>
  );
});
