import * as React from "react";
import { Popover } from "@base-ui/react/popover";
import { emojiPickerInitialFocus } from "emoji-components";
import { cn } from "@/lib/utils";

// Base UI's Popover with the picker's initial focus and the placement the gallery is drawn with. Close it in the picker's onSelect.
function Positioner({ side = "bottom", align = "start", sideOffset = 8, collisionPadding = 8, className, ...props }: Popover.Positioner.Props) {
  return <Popover.Positioner side={side} align={align} sideOffset={sideOffset} collisionPadding={collisionPadding} positionMethod="fixed" sticky className={cn("z-50", className)} {...props} />;
}

function Popup({ initialFocus, ...props }: Popover.Popup.Props) {
  const popup = React.useRef<HTMLDivElement>(null);
  return <Popover.Popup ref={popup} data-slot="popover-content" initialFocus={initialFocus ?? (() => emojiPickerInitialFocus(popup.current))} {...props} />;
}

export const EmojiPopover = { Root: Popover.Root, Trigger: Popover.Trigger, Portal: Popover.Portal, Positioner, Popup };
