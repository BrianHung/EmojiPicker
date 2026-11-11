"use client";

import * as React from "react";
import type { EmojiPickerNavCategory, UseEmojiPickerCategoriesReturnValue } from "../root/utils/useEmojiPickerCategories";

export type EmojiPickerCategoryNavContext = { id: string; disabled: boolean; getItemProps: UseEmojiPickerCategoriesReturnValue["getItemProps"] };

export const EmojiPickerCategoryNavContext = React.createContext<EmojiPickerCategoryNavContext | null>(null);

export const EmojiPickerCategoryNavTabContext = React.createContext<EmojiPickerNavCategory | null>(null);
