"use client";

import { EmojiReactionBar as EmojiReactionBarPrimitive } from "emoji-components";
import { cn } from "@/lib/utils";

function EmojiReactionBar({ className, ...props }: EmojiReactionBarPrimitive.Props) {
  return <EmojiReactionBarPrimitive className={cn("flex flex-wrap items-center gap-1 data-[orientation=vertical]:flex-col", className)} {...props} />;
}

export { EmojiReactionBar };
