"use client";

import { portal } from "../../../popover/floating-ui/utils/portal";
import type { EmojiSuggestionsPortalProps } from "../../utils/types";
import { useEmojiSuggestionsRootContext } from "../root/EmojiSuggestionsRootContext";

export function EmojiSuggestionsPortal({ container, children }: EmojiSuggestionsPortalProps) {
  return portal(useEmojiSuggestionsRootContext("Portal").status, container, children);
}

export declare namespace EmojiSuggestionsPortal {
  type Props = EmojiSuggestionsPortalProps;
}
