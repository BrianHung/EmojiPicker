"use client";

import * as React from "react";
import { Emoji, EmojiPicker, type EmojiItem, type EmojiSelection } from "@brianhung/emoji-picker-react";
import { cn } from "@/lib/utils";

const root =
  "relative flex max-h-(--available-height) flex-col overflow-hidden **:box-border motion-reduce:duration-0 motion-reduce:**:duration-0";
const tone =
  "flex size-7 shrink-0 items-center justify-center rounded-md text-base leading-none outline-none hover:bg-accent focus-visible:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary data-[selected]:bg-accent";
const cell =
  "relative flex cursor-default items-center justify-center overflow-hidden rounded-md outline-none transition-colors forced-colors:[&:is([data-highlighted],[data-focus-visible])]:[outline:2px_solid_Highlight] forced-colors:[&:is([data-highlighted],[data-focus-visible])]:[outline-offset:-2px] hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[focus-visible]:outline-2 data-[focus-visible]:-outline-offset-2 data-[focus-visible]:outline-primary";
const reaction = "flex size-10 items-center justify-center rounded-full text-[26px] transition-transform duration-150 ease-out [@media(hover:hover)_and_(pointer:fine)]:hover:scale-110 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-accent active:not-disabled:scale-[0.97]";

function EmojiPickerSearch({ autoFocus }: { autoFocus?: boolean }) {
  return (
    <EmojiPicker.Search className="relative flex h-10 shrink-0 items-center gap-1 border-b border-border pr-1.5 pl-3 has-[input:focus-visible]:border-primary forced-colors:has-[input:focus-visible]:outline-2 forced-colors:has-[input:focus-visible]:-outline-offset-2">
      <EmojiPicker.SearchInput autoFocus={autoFocus} className="h-full w-full bg-transparent pr-8 pl-6 text-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none">
        <EmojiPicker.SearchClear className="absolute top-1/2 right-1 flex size-6 -translate-y-1/2 transform-none items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground">
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </EmojiPicker.SearchClear>
      </EmojiPicker.SearchInput>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-50" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <EmojiPicker.SkinTone className="relative inline-flex">
        <EmojiPicker.SkinToneTrigger className={tone}>
          <EmojiPicker.SkinToneGlyph />
        </EmojiPicker.SkinToneTrigger>
        <EmojiPicker.SkinToneOptions className="end-0 top-1/2 -translate-y-1/2 z-3 flex rounded-lg border border-border bg-popover p-0.5 shadow-md">
          {(t) => (
            <EmojiPicker.SkinToneOption tone={t} className={tone}>
              <EmojiPicker.SkinToneGlyph />
            </EmojiPicker.SkinToneOption>
          )}
        </EmojiPicker.SkinToneOptions>
      </EmojiPicker.SkinTone>
      <EmojiPicker.SearchStatus className="sr-only" />
    </EmojiPicker.Search>
  );
}

function EmojiPickerCell({ className, ...props }: Omit<React.ComponentProps<typeof EmojiPicker.ListCell>, "className"> & { className?: string }) {
  return <EmojiPicker.ListCell className={cn(cell, className)} {...props} />;
}

type EmojiPickerBodyProps = {
  autoFocus?: boolean;
  rows?: React.ReactNode;
  cell?: (emoji: EmojiItem) => React.ReactNode;
  footer?: boolean;
  empty?: React.ReactNode;
};

function EmojiPickerBody({ autoFocus, rows, cell: renderCell, footer = true, empty = "No emoji found." }: EmojiPickerBodyProps) {
  return (
    <>
      <EmojiPickerSearch autoFocus={autoFocus} />
      {rows}
      <EmojiPicker.Viewport className="relative flex-1 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]">
        <EmojiPicker.List
          className="outline-none"
          renderEmptyState={({ status, retry }) => (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {status === "empty" ? empty : status === "loading" ? "Loading…" : (
                <button type="button" className="underline" onClick={retry}>
                  Could not load emoji. Try again
                </button>
              )}
            </div>
          )}
        >
          {() => (
            <EmojiPicker.ListSection>
              <EmojiPicker.ListSectionTitle className="flex items-center bg-popover px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground" />
              <EmojiPicker.ListItems>{renderCell ?? (() => <EmojiPickerCell />)}</EmojiPicker.ListItems>
            </EmojiPicker.ListSection>
          )}
        </EmojiPicker.List>
      </EmojiPicker.Viewport>
      {footer ? <EmojiPickerFooter /> : null}
    </>
  );
}

function EmojiPickerFooter({ className }: { className?: string }) {
  return (
    <EmojiPicker.Preview className={cn("flex h-10 shrink-0 items-center gap-2 border-t border-border px-3 text-xs", className)}>
      {({ emoji }) =>
        emoji ? (
          <>
            <Emoji emoji={emoji} aria-hidden className="text-lg" />
            <span className="truncate font-medium">{emoji.name}</span>
            {emoji.shortcodes[0] ? <code className="ml-auto shrink-0 text-muted-foreground">:{emoji.shortcodes[0]}:</code> : null}
          </>
        ) : (
          <span className="text-muted-foreground">Pick an emoji</span>
        )
      }
    </EmojiPicker.Preview>
  );
}

type EmojiPickerCardProps = Omit<React.ComponentProps<typeof EmojiPicker.Root>, "children" | "className"> & EmojiPickerBodyProps & { className?: string };

function EmojiPickerCard({ className, autoFocus, rows, cell: renderCell, footer, empty, ...props }: EmojiPickerCardProps) {
  return (
    <EmojiPicker.Root
      className={cn(
        root,
        "h-[360px] w-[328px] max-w-full in-data-side:max-w-[var(--available-width,calc(100vw-24px))] in-data-placement:max-w-[calc(100vw-24px)] rounded-xl [corner-shape:squircle] border border-border bg-popover text-popover-foreground shadow-md [--emoji-cell-size:36px] [--emoji-header-height:28px] [--emoji-list-padding:6px] [--emoji-size:24px]",
        className,
      )}
      {...props}
    >
      <EmojiPickerBody autoFocus={autoFocus} rows={rows} cell={renderCell} footer={footer} empty={empty} />
    </EmojiPicker.Root>
  );
}

function EmojiTapback({ onSelect, count = 5, className }: { onSelect: (selection: EmojiSelection) => void; count?: number; className?: string }) {
  return (
    <EmojiPicker.Root
      reactions={count}
      onSelect={(selection, { collapse }) => {
        onSelect(selection);
        collapse?.();
      }}
      className={cn(
        root,
        "w-fit max-w-[352px] rounded-full border border-border bg-popover text-foreground shadow-lg",
        "has-[[data-slot=emoji-picker-panel]:not([hidden])]:h-[360px] has-[[data-slot=emoji-picker-panel]:not([hidden])]:w-[328px] has-[[data-slot=emoji-picker-panel]:not([hidden])]:rounded-xl [--emoji-cell-size:36px] [--emoji-header-height:28px] [--emoji-list-padding:6px] [--emoji-size:24px]",
        className,
      )}
    >
      <EmojiPicker.Reactions className="flex items-center gap-0.5 p-1.5 [--emoji-image-size:28px]">
        <EmojiPicker.ReactionsItems>{(emoji) => <EmojiPicker.ReactionsItem emoji={emoji} className={reaction} />}</EmojiPicker.ReactionsItems>
        <EmojiPicker.ReactionsExpand className={reaction}>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </EmojiPicker.ReactionsExpand>
      </EmojiPicker.Reactions>
      <EmojiPicker.Panel className="flex min-h-0 min-w-0 flex-1 flex-col">
        <EmojiPickerBody footer={false} />
      </EmojiPicker.Panel>
    </EmojiPicker.Root>
  );
}

export { EmojiPickerCell, EmojiPickerBody, EmojiPickerFooter, EmojiPickerCard, EmojiTapback };
export type { EmojiPickerBodyProps, EmojiPickerCardProps };
