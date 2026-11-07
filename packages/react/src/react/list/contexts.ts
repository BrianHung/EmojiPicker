"use client";

import * as React from "react";
import type { EmojiItem, EmojiSection } from "@brianhung/emoji-picker-core";
import type { Cells } from "./use-cell";

export const CellsContext = React.createContext<Cells | null>(null);
export const HorizontalContext = React.createContext(false);
export const TemplateContext = React.createContext<(section: EmojiSection) => React.ReactNode>(() => null);
export const ItemContext = React.createContext<EmojiItem | null>(null);

export interface SectionData {
  section: EmojiSection;
  groupProps: React.HTMLAttributes<HTMLElement>;
  headingProps: React.HTMLAttributes<HTMLElement>;
}
export const SectionContext = React.createContext<SectionData | null>(null);

export function useCells(part: string): Cells {
  const cells = React.useContext(CellsContext);
  if (!cells) throw new Error(`EmojiPicker.List${part} must be inside EmojiPicker.List.`);
  return cells;
}

export function useSection(part: string): SectionData {
  const data = React.useContext(SectionContext);
  if (!data) throw new Error(`EmojiPicker.List${part} must be in an EmojiPicker.ListSection, inside EmojiPicker.List's children.`);
  return data;
}
