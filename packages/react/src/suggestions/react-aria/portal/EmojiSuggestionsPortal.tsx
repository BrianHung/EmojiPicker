"use client";

import { EmojiPopoverPortal } from "../../../popover/react-aria/portal/EmojiPopoverPortal";
import type { EmojiSuggestionsPortalProps } from "../../../popover/utils/types";

export function EmojiSuggestionsPortal(props: EmojiSuggestionsPortalProps) {
  return <EmojiPopoverPortal {...props} />;
}

export declare namespace EmojiSuggestionsPortal {
  type Props = EmojiSuggestionsPortalProps;
}
