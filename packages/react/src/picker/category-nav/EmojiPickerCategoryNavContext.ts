"use client";

import * as React from "react";
import type { EmojiPickerNavCategory } from "../root/utils/useEmojiPickerCategoryNavigation";

export type EmojiPickerCategoryNavContext = { id: string; selected: string; disabled: boolean; choose(key: string, instant: boolean): void };

export const EmojiPickerCategoryNavContext = React.createContext<EmojiPickerCategoryNavContext | null>(null);

export const EmojiPickerCategoryNavTabContext = React.createContext<EmojiPickerNavCategory | null>(null);
