"use client";

import * as React from "react";
import type { EmojiPickerOrientation } from "../utils/types";

export const EmojiPickerViewportContext = React.createContext<((orientation: EmojiPickerOrientation) => void) | null>(null);
