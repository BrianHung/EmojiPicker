"use client";

import type * as React from "react";
import { Emoji, EmojiPicker as EmojiPickerPrimitive, useEmojiLabels, useEmojiStatus } from "emoji-components";
import { cn } from "@/lib/utils";

const button =
  "flex shrink-0 items-center justify-center outline-hidden hover:bg-accent focus-visible:bg-accent focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-primary";
const reaction =
  "flex size-10 items-center justify-center rounded-full text-[26px] outline-hidden transition-transform duration-150 ease-out focus-visible:bg-accent [@media(hover:hover)_and_(pointer:fine)]:hover:scale-110 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-accent active:not-disabled:scale-[0.97] data-selected:bg-accent data-selected:text-accent-foreground data-selected:ring-1 data-selected:ring-ring data-selected:ring-inset";

function EmojiPicker({ className, ...props }: EmojiPickerPrimitive.Root.Props) {
  return (
    <EmojiPickerPrimitive.Root
      className={cn(
        "relative flex h-[360px] max-h-(--available-height) w-[328px] max-w-full flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-md **:box-border [corner-shape:squircle] in-data-side:max-w-[var(--available-width,calc(100vw-24px))] in-data-placement:max-w-[calc(100vw-24px)] motion-reduce:duration-0 motion-reduce:**:duration-0 [--emoji-picker-cell-size:36px] [--emoji-picker-emoji-size:24px] [--emoji-picker-header-height:28px] [--emoji-picker-list-padding:6px]",
        "data-reactions-open:h-auto data-reactions-open:w-fit data-reactions-open:max-w-[352px]",
        className,
      )}
      {...props}
    />
  );
}

function EmojiPickerSearch({ className, ...props }: EmojiPickerPrimitive.SearchInput.Props) {
  return (
    <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border pr-1.5 pl-3 forced-colors:has-[input:focus-visible]:outline-2 forced-colors:has-[input:focus-visible]:-outline-offset-2">
      <EmojiPickerPrimitive.Search>
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 opacity-50" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <EmojiPickerPrimitive.SearchInput
          className={cn("h-full w-full bg-transparent pr-8 pl-6 text-sm outline-hidden placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none", className)}
          {...props}
        />
        <EmojiPickerPrimitive.SearchClear className="absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground">
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </EmojiPickerPrimitive.SearchClear>
      </EmojiPickerPrimitive.Search>
      <EmojiPickerSkinTone />
      <EmojiPickerPrimitive.SearchStatus className="sr-only" />
    </div>
  );
}

function EmojiPickerSkinTone({ className, ...props }: EmojiPickerPrimitive.SkinTone.Props) {
  const tone = cn(button, "size-7 rounded-md text-base leading-none data-selected:bg-accent");
  return (
    <EmojiPickerPrimitive.SkinTone className={cn("relative inline-flex", className)} {...props}>
      <EmojiPickerPrimitive.SkinToneTrigger className={tone}>
        <EmojiPickerPrimitive.SkinToneGlyph />
      </EmojiPickerPrimitive.SkinToneTrigger>
      <EmojiPickerPrimitive.SkinToneOptions className="end-0 top-1/2 z-3 flex -translate-y-1/2 rounded-lg border border-border bg-popover p-0.5 shadow-md">
        {(t) => (
          <EmojiPickerPrimitive.SkinToneOption tone={t} className={tone}>
            <EmojiPickerPrimitive.SkinToneGlyph />
          </EmojiPickerPrimitive.SkinToneOption>
        )}
      </EmojiPickerPrimitive.SkinToneOptions>
    </EmojiPickerPrimitive.SkinTone>
  );
}

function EmojiPickerContent({
  className,
  children = () => <EmojiPickerCell />,
  renderEmptyState = ({ status, retry }) => <EmojiPickerEmpty status={status} retry={retry} />,
  ...props
}: Omit<EmojiPickerPrimitive.Viewport.Props, "children"> & Pick<EmojiPickerPrimitive.List.Props, "renderEmptyState"> & { children?: EmojiPickerPrimitive.ListItems.Props["children"] }) {
  return (
    <EmojiPickerPrimitive.Viewport className={cn("relative min-h-0 flex-1 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]", className)} {...props}>
      <EmojiPickerPrimitive.List className="outline-hidden" renderEmptyState={renderEmptyState}>
        {() => (
          <EmojiPickerPrimitive.ListSection>
            <EmojiPickerPrimitive.ListSectionTitle className="flex items-center bg-popover px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground" />
            <EmojiPickerPrimitive.ListItems>{children}</EmojiPickerPrimitive.ListItems>
          </EmojiPickerPrimitive.ListSection>
        )}
      </EmojiPickerPrimitive.List>
    </EmojiPickerPrimitive.Viewport>
  );
}

function EmojiPickerCell({ className, ...props }: EmojiPickerPrimitive.ListCell.Props) {
  return (
    <EmojiPickerPrimitive.ListCell
      className={cn(
        "relative flex cursor-default items-center justify-center overflow-hidden rounded-md outline-hidden transition-colors focus-visible:bg-accent focus-visible:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground data-focus-visible:outline-2 data-focus-visible:outline-solid data-focus-visible:-outline-offset-2 data-focus-visible:outline-primary forced-colors:[&:is([data-highlighted],[data-focus-visible])]:[outline:2px_solid_Highlight] forced-colors:[&:is([data-highlighted],[data-focus-visible])]:[outline-offset:-2px]",
        className,
      )}
      {...props}
    />
  );
}

function EmojiPickerEmpty({ status, retry, className, children = "No emoji found.", ...props }: Pick<EmojiPickerPrimitive.List.EmptyState, "status" | "retry"> & React.ComponentProps<"div">) {
  const data = useEmojiStatus();
  return (
    <div data-slot="emoji-picker-empty" className={cn("py-6 text-center text-sm text-muted-foreground", className)} {...props}>
      {status === "loading" ? (
        "Loading…"
      ) : status === "error" ? (
        <button type="button" className="underline" onClick={retry}>
          {data === "error" ? "Could not load emoji." : "Search failed."} Try again
        </button>
      ) : (
        children
      )}
    </div>
  );
}

function EmojiPickerFooter({ className, ...props }: EmojiPickerPrimitive.Preview.Props) {
  const labels = useEmojiLabels();
  return (
    <EmojiPickerPrimitive.Preview className={cn("flex h-10 shrink-0 items-center gap-2 border-t border-border px-3 text-xs", className)} {...props}>
      {({ emoji, unified }) =>
        emoji && unified ? (
          <>
            <Emoji emoji={unified} aria-hidden className="shrink-0 text-lg" />
            <span className="min-w-0 truncate font-medium">{emoji.name}</span>
            {emoji.shortcodes[0] ? <code className="ml-auto min-w-0 shrink-[1000] truncate text-muted-foreground">:{emoji.shortcodes[0]}:</code> : null}
          </>
        ) : (
          <span className="text-muted-foreground">{labels.previewCaption}</span>
        )
      }
    </EmojiPickerPrimitive.Preview>
  );
}

function EmojiPickerReactions({ className, children, ...props }: EmojiPickerPrimitive.Reactions.Props) {
  return (
    <EmojiPickerPrimitive.Reactions className={cn("flex items-center gap-0.5 p-1.5 [--emoji-picker-emoji-image-size:28px]", className)} {...props}>
      {children ?? (
        <>
          <EmojiPickerPrimitive.ReactionsItems>{(emoji) => <EmojiPickerPrimitive.ReactionsItem emoji={emoji} className={reaction} />}</EmojiPickerPrimitive.ReactionsItems>
          <EmojiPickerPrimitive.ReactionsExpand className={reaction}>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </EmojiPickerPrimitive.ReactionsExpand>
        </>
      )}
    </EmojiPickerPrimitive.Reactions>
  );
}

function EmojiPickerPanel({ className, ...props }: EmojiPickerPrimitive.Panel.Props) {
  return <EmojiPickerPrimitive.Panel className={cn("flex min-h-0 min-w-0 flex-1 flex-col", className)} {...props} />;
}

export { EmojiPicker, EmojiPickerCell, EmojiPickerContent, EmojiPickerEmpty, EmojiPickerFooter, EmojiPickerPanel, EmojiPickerReactions, EmojiPickerSearch, EmojiPickerSkinTone };
