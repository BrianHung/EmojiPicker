"use client";

import * as React from "react";
import { mergeRefs } from "react-aria/mergeRefs";
import { mergePartProps } from "../../internals/mergePartProps";
import { renderElement, resolve } from "../../internals/renderElement";
import type { EmojiPickerPartElementProps } from "../../internals/types";
import { CellsContext, HorizontalContext, ItemContext } from "../list/EmojiPickerListContext";
import type { EmojiItem } from "@brianhung/emoji-picker-core";
import { useCell } from "./utils/useEmojiCell";

export type EmojiPickerListCellState = { emoji: EmojiItem; row: number; column: number; highlighted: boolean; hovered: boolean; focused: boolean; focusVisible: boolean; pressed: boolean; selected: boolean };

export type EmojiPickerListCellProps = EmojiPickerPartElementProps<EmojiPickerListCellState>;

const CELL: React.CSSProperties = { width: "var(--ep-cell)", height: "var(--ep-cell)", maxWidth: "var(--ep-cell)", maxHeight: "var(--ep-cell)" };
const FILL: React.CSSProperties = { width: "100%", height: "100%" };

export const EmojiPickerListCell = React.forwardRef<HTMLDivElement, EmojiPickerListCellProps>(function EmojiPickerListCell({ className, style, render, children, ...props }, ref) {
  const cells = React.useContext(CellsContext);
  const item = React.useContext(ItemContext);
  if (!cells || !item) throw new Error("EmojiPicker.ListCell must be inside EmojiPicker.ListItems.");
  const horizontal = React.useContext(HorizontalContext);
  const { cellProps, state } = useCell(cells, item);
  const refs = React.useMemo(() => mergeRefs<HTMLDivElement>(cellProps.ref, ref), [cellProps.ref, ref]);
  return renderElement(
    "div",
    { ...mergePartProps(props, cellProps), ref: refs, className, style: (s: EmojiPickerListCellState) => ({ ...(horizontal ? FILL : CELL), ...resolve(style, s) }), render, children: children ?? cellProps.children },
    state,
  );
});

export declare namespace EmojiPickerListCell {
  type Props = EmojiPickerListCellProps;
  type State = EmojiPickerListCellState;
}
