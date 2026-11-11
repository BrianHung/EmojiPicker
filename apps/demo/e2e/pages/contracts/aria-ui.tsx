// Stand-ins for shadcn/ui's React Aria base (--base aria), which registry/aria/emoji-picker-popover.tsx imports
import type * as React from "react";
import { Button as AriaButton, type ButtonProps } from "react-aria-components/Button";
import { Dialog, DialogTrigger } from "react-aria-components/Dialog";
import { Popover as AriaPopover, type PopoverProps } from "react-aria-components/Popover";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Button({ variant, className, ...props }: ButtonProps & { variant?: "outline"; className?: string }) {
  return <AriaButton className={cn(buttonVariants({ variant }), className)} {...props} />;
}

export const PopoverTrigger = DialogTrigger;

export function Popover({ className, children, "aria-label": label, ...props }: PopoverProps & { className?: string; "aria-label"?: string; children: React.ReactNode }) {
  return (
    <AriaPopover data-slot="popover-content" offset={4} className={cn("rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden", className)} {...props}>
      <Dialog aria-label={label} className="outline-hidden">
        {children}
      </Dialog>
    </AriaPopover>
  );
}
