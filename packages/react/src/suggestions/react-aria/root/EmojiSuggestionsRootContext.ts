"use client";

import * as React from "react";
import type { EmojiSuggestionsRootProps } from "../../../popover/utils/types";

export type EmojiSuggestionsRootContext = Pick<EmojiSuggestionsRootProps, "open" | "onOpenChange" | "onOpenChangeComplete">;

export const EmojiSuggestionsRootContext = React.createContext<EmojiSuggestionsRootContext | null>(null);
