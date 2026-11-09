"use client";

import * as React from "react";
import type { EmojiPopoverContainer } from "../../utils/types";

export const EmojiPopoverPortalContext = React.createContext<EmojiPopoverContainer | undefined>(undefined);
