"use client";

import * as React from "react";
import type { EmojiRecord, SkinToneValue } from "@brianhung/emoji-picker-core";
import type { ListState } from "react-stately/useListState";

export type EmojiPickerListVariationsContext = { record: EmojiRecord; current: SkinToneValue; pick(unified: string, event?: Event): void; list: ListState<unknown> };
export const EmojiPickerListVariationsContext = React.createContext<EmojiPickerListVariationsContext | null>(null);
export const EmojiPickerListVariationsToneContext = React.createContext<SkinToneValue>(0);
