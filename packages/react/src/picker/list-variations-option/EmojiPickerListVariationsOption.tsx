"use client";

import * as React from "react";
import type { EmojiRecord, SkinToneValue } from "@emoji-components/core";
import { nameWithTone } from "@emoji-components/core/internal";
import { useEmojiPickerRootContext } from "../root/EmojiPickerRootContext";
import { useObjectRef } from "react-aria/useObjectRef";
import { Glyph } from "../../emoji/Glyph";
import { mergePartProps } from "../../internals/mergePartProps";
import { useInteraction } from "../../internals/useInteraction";
import { useLayoutEffect } from "../../utils/useLayoutEffect";
import { flag, renderElement, resolve } from "../../internals/renderElement";
import type { EmojiPickerInteractionState, EmojiPickerPartElementProps } from "../../internals/types";
import { SLOTS } from "../../internals/slots";

import { EmojiPickerListVariationsContext, EmojiPickerListVariationsToneContext } from "../list-variations/EmojiPickerListVariationsContext";
import * as EmojiPickerListVariationsOptionDataAttributes from "./EmojiPickerListVariationsOptionDataAttributes";

export type EmojiPickerListVariationsOptionState = EmojiPickerInteractionState & { emoji: EmojiRecord; unified: string; tone: SkinToneValue; selected: boolean; highlighted: boolean };

export type EmojiPickerListVariationsOptionProps = EmojiPickerPartElementProps<EmojiPickerListVariationsOptionState, HTMLDivElement, "role"> & {
  tone?: SkinToneValue;
};

const OPTION: React.CSSProperties = { position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "var(--ep-cell)", height: "var(--ep-cell)", overflow: "hidden", cursor: "default" };

const unifiedOf = (record: EmojiRecord, tone: SkinToneValue) => (tone ? record.tones[tone - 1]! : record.unified);

export const EmojiPickerListVariationsOption = React.forwardRef<HTMLDivElement, EmojiPickerListVariationsOptionProps>(function EmojiPickerListVariationsOption({ tone: toneProp, style, children, ...props }, ref) {
  const row = React.useContext(EmojiPickerListVariationsContext);
  const contextTone = React.useContext(EmojiPickerListVariationsToneContext);
  const { labels } = useEmojiPickerRootContext("EmojiPicker.ListVariationsOption");
  const interaction = useInteraction({ pressed: false });
  const own = useObjectRef(ref);
  if (!row) throw new Error("EmojiPicker.ListVariationsOption must be inside EmojiPicker.ListVariations.");
  const tone = toneProp ?? contextTone;
  const unified = unifiedOf(row.record, tone);
  const selected = tone === row.current;
  // The row's useListBox moves focusedKey. useOption would bring usePress, useLongPress and links (2.6 kB gzip) for these few props
  const manager = row.list.selectionManager;
  const focused = manager.focusedKey === unified;
  useLayoutEffect(() => {
    if (focused && manager.isFocused) own.current?.focus({ preventScroll: true });
  }, [focused, manager.isFocused, own]);
  const state: EmojiPickerListVariationsOptionState = { ...interaction.state, emoji: row.record, unified, tone, selected, highlighted: interaction.state.focused || interaction.state.hovered };
  return renderElement(
    "div",
    {
      role: "option",
      "aria-selected": selected,
      "aria-label": nameWithTone(row.record.name, unified, labels.withSkinTone),
      tabIndex: focused ? 0 : -1,
      "data-key": unified,
      ...mergePartProps(props, interaction.props, { onFocus: () => manager.setFocusedKey(unified), onClick: (e: React.MouseEvent) => row.pick(unified, e.nativeEvent) }),
      ref: own,
      "data-slot": SLOTS.variation,
      [EmojiPickerListVariationsOptionDataAttributes.unified]: unified,
      [EmojiPickerListVariationsOptionDataAttributes.selected]: flag(selected),
      [EmojiPickerListVariationsOptionDataAttributes.highlighted]: flag(state.highlighted),
      style: (s: EmojiPickerListVariationsOptionState) => ({ ...OPTION, ...resolve(style, s) }),
      children: children ?? <Glyph unified={unified} record={row.record} />,
    },
    state,
  );
});

export declare namespace EmojiPickerListVariationsOption {
  type Props = EmojiPickerListVariationsOptionProps;
  type State = EmojiPickerListVariationsOptionState;
}
