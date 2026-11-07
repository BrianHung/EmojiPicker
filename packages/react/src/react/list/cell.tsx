"use client";

import * as React from "react";
import { mergeRefs } from "react-aria/mergeRefs";
import { mergePartProps } from "../utils/events";
import { renderElement, resolve, type EmojiPickerPartElementProps } from "../utils/render";
import { CellsContext, HorizontalContext, ItemContext } from "./contexts";
import { useCell, type CellState } from "./use-cell";

export type CellProps = EmojiPickerPartElementProps<CellState>;

const CELL: React.CSSProperties = { width: "var(--ep-cell)", height: "var(--ep-cell)", maxWidth: "var(--ep-cell)", maxHeight: "var(--ep-cell)" };
const FILL: React.CSSProperties = { width: "100%", height: "100%" };

export const Cell = React.forwardRef<HTMLDivElement, CellProps>(function Cell({ className, style, render, children, ...props }, ref) {
  const cells = React.useContext(CellsContext);
  const item = React.useContext(ItemContext);
  if (!cells || !item) throw new Error("EmojiPicker.List.Cell must be inside List.Items.");
  const horizontal = React.useContext(HorizontalContext);
  const { cellProps, state } = useCell(cells, item);
  const refs = React.useMemo(() => mergeRefs<HTMLDivElement>(cellProps.ref, ref), [cellProps.ref, ref]);
  return renderElement("div", { ...mergePartProps(props, cellProps), ref: refs, className, style: (s: CellState) => ({ ...(horizontal ? FILL : CELL), ...resolve(style, s) }), render, children: children ?? cellProps.children }, state);
});
