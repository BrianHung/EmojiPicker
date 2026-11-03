"use client";

// shadcn/ui emoji picker. Installed by `npx shadcn add <registry>/emoji-picker.json`:
// you own this file; restyle anything. Built on @brianhung/emoji-picker's unstyled parts.
import * as React from "react";
import { EmojiPicker, EmojiPopover, Tapback, type EmojiSelection, type ListProps, type PickerComponents, type RootProps } from "@brianhung/emoji-picker";
import { cn } from "@/lib/utils";

function ClearButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={cn("absolute top-1/2 right-1 flex size-6 -translate-y-1/2 transform-none items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground", className)}>
      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  );
}

/** A drawn plus, centered whatever the font (a "+" glyph sits low in many). */
function ExpandButton({ children: _, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props}>
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}

const controls: PickerComponents = { ClearButton, ExpandButton };

export type EmojiPickerBodyProps = {
  /** Rows between search and the grid (custom rows). */
  rows?: React.ReactNode;
  /** Replace cells or section titles. */
  components?: ListProps["components"];
  /** The hovered or highlighted emoji, with its name and shortcode. Default true. */
  footer?: boolean;
  /** Shown when a search has no results. Default "No emoji found." */
  empty?: React.ReactNode;
};

/** Search, grid and footer: the inside of a picker, for any Root. Styled like shadcn's Command. */
export function EmojiPickerBody({ rows, components, footer = true, empty = "No emoji found." }: EmojiPickerBodyProps) {
  return (
    <>
      <EmojiPicker.Search
        className="relative flex h-10 shrink-0 items-center gap-1 border-b border-border pr-1.5 pl-3"
        inputProps={{ className: "h-full w-full bg-transparent pr-8 pl-6 text-sm outline-none placeholder:text-muted-foreground" }}
      >
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-50" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <EmojiPicker.SkinTone emoji="270b" buttonClassName="flex size-7 shrink-0 items-center justify-center rounded-md text-base leading-none outline-none hover:bg-accent focus-visible:bg-accent" optionsClassName="flex rounded-lg border border-border bg-popover p-0.5 shadow-md" />
      </EmojiPicker.Search>
      {rows}
      <EmojiPicker.Viewport className="relative flex-1 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]">
        <EmojiPicker.List
          components={components}
          cellClassName="flex items-center justify-center rounded-md outline-none transition-colors hover:bg-accent focus-visible:bg-accent data-[highlighted]:bg-accent"
          headerClassName="bg-popover px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground"
        />
        <EmojiPicker.Empty className="py-6 text-center text-sm text-muted-foreground">{empty}</EmojiPicker.Empty>
        <EmojiPicker.Loading className="py-6 text-center text-sm text-muted-foreground">Loading…</EmojiPicker.Loading>
      </EmojiPicker.Viewport>
      {footer ? <EmojiPickerFooter /> : null}
    </>
  );
}

/** The hovered (or, while searching, highlighted) emoji. */
export function EmojiPickerFooter({ className }: { className?: string }) {
  const active = EmojiPicker.useActiveEmoji();
  return (
    <div className={cn("flex h-10 shrink-0 items-center gap-2 border-t border-border px-3 text-xs", className)}>
      {active ? (
        <>
          <span className="text-lg leading-none">{active.imageUrl ? <img src={active.imageUrl} alt="" className="size-[18px]" /> : active.emoji}</span>
          <span className="truncate font-medium">{active.name}</span>
          {active.shortcodes[0] ? <code className="ml-auto shrink-0 text-muted-foreground">:{active.shortcodes[0]}:</code> : null}
        </>
      ) : (
        <span className="text-muted-foreground">Pick an emoji</span>
      )}
    </div>
  );
}

export type EmojiPickerCardProps = Omit<RootProps, "children"> & EmojiPickerBodyProps;

/** The picker: search, skin tone, the grid and a footer, on shadcn's popover surface. */
export const EmojiPickerCard = React.forwardRef<HTMLElement, EmojiPickerCardProps>(function EmojiPickerCard({ className, rows, components, footer, empty, ...props }, ref) {
  return (
    <EmojiPicker.Root
      ref={ref}
      components={controls}
      className={cn(
        // corner-shape: squircle where supported (Chromium); plain rounded corners elsewhere.
        "flex h-[360px] w-[328px] max-w-full flex-col overflow-hidden rounded-xl [corner-shape:squircle] border border-border bg-popover text-popover-foreground shadow-md [--emoji-cell-size:36px] [--emoji-header-height:28px] [--emoji-list-padding:6px] [--emoji-size:24px]",
        className,
      )}
      {...props}
    >
      <EmojiPickerBody rows={rows} components={components} footer={footer} empty={empty} />
    </EmojiPicker.Root>
  );
});

export type EmojiPickerPopoverProps = {
  onSelect: (selection: EmojiSelection) => void;
  /** The trigger's contents ("🙂 Add reaction"). */
  children: React.ReactNode;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  /** Trigger classes; replaces the default outline button look. */
  triggerClassName?: string;
  /** Accessible name of the trigger. */
  label?: string;
  /** A different picker inside (a product style). Picking closes the popover. */
  picker?: React.ReactNode;
};

/** A trigger that opens the picker in a popover; picking closes it. */
export function EmojiPickerPopover({ onSelect, children, side = "bottom", align = "start", triggerClassName, label = "Open emoji picker", picker }: EmojiPickerPopoverProps) {
  return (
    <EmojiPopover.Root>
      <EmojiPopover.Trigger
        aria-label={label}
        className={cn(
          "inline-flex items-center gap-2 text-sm transition-colors hover:bg-accent data-[state=open]:bg-accent",
          triggerClassName ?? "rounded-md border border-border px-3 py-2",
        )}
      >
        {children}
      </EmojiPopover.Trigger>
      {/* Scales from the trigger (--transform-origin) and fades: 150ms in, 100ms out, interruptible. Reduced motion keeps only the fade. */}
      <EmojiPopover.Content
        side={side}
        align={align}
        aria-label="Emoji picker"
        className="origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-100 motion-safe:data-starting-style:scale-95 motion-safe:data-ending-style:scale-95"
      >
        {picker ?? <EmojiPickerCard onSelect={onSelect} />}
      </EmojiPopover.Content>
    </EmojiPopover.Root>
  );
}

/** iMessage-style tapback: your top 5, and "+" that expands into the full picker. */
export function EmojiTapback({ onSelect, className }: { onSelect: (selection: EmojiSelection) => void; className?: string }) {
  return (
    <Tapback
      components={controls}
      onSelect={onSelect}
      className={cn(
        "flex w-fit max-w-[352px] flex-col overflow-hidden rounded-full border border-border bg-popover text-foreground shadow-lg",
        "has-[[data-slot=panel]:not([hidden])]:h-[360px] has-[[data-slot=panel]:not([hidden])]:w-[328px] has-[[data-slot=panel]:not([hidden])]:rounded-xl [--emoji-cell-size:36px] [--emoji-header-height:28px] [--emoji-list-padding:6px] [--emoji-size:24px]",
        className,
      )}
      // Hover grows a reaction only with a real pointer (a tap would leave it stuck);
      // a press shrinks it slightly, so the tap registers.
      reactionsClassName="flex items-center gap-0.5 p-1.5 [--emoji-image-size:28px] [&_button]:flex [&_button]:size-10 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-full [&_button]:text-[26px] [&_button]:transition-transform [&_button]:duration-150 [&_button]:ease-out [@media(hover:hover)_and_(pointer:fine)]:[&_button:hover]:scale-110 [@media(hover:hover)_and_(pointer:fine)]:[&_button:hover]:bg-accent [&_button:active:not(:disabled)]:scale-[0.97]"
    >
      <EmojiPickerBody footer={false} />
    </Tapback>
  );
}
