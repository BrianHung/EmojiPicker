"use client";

import { useStore } from "../../utils/useStore";
import { useEmojiPickerRootContext } from "../root/EmojiPickerRootContext";

export const useQueryEmpty = (part: string) => useStore(useEmojiPickerRootContext(part).state, (s) => s.query === "");
