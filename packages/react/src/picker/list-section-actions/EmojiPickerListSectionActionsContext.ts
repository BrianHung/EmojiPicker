"use client";

import * as React from "react";
import type { EmojiSection } from "@brianhung/emoji-picker-core";

// Where List's actions layer places a section's actions
export type EmojiPickerListSectionActionsContext = { section: EmojiSection; top: number; height: number; headerHeight: number; toggle(): void; block: (el: HTMLElement | null) => void };

export const EmojiPickerListSectionActionsContext = React.createContext<EmojiPickerListSectionActionsContext | null>(null);
