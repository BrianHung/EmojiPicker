import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { EmojiPicker, useEmojiGrid } from "@brianhung/emoji-picker";

/** EmojiPicker.List's grid, virtualized by TanStack Virtual. */
export function TanStackList() {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const grid = useEmojiGrid({
    columns: 8,
    rowHeight: 36,
    headerHeight: 28,
    scrollToIndex: (index, options) => virtualizer.scrollToIndex(index, options),
  });
  const virtualizer = useVirtualizer({
    count: grid.rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => grid.rows[i]!.size,
    getItemKey: React.useCallback((i: number) => grid.rows[i]!.key, [grid.rows]),
    overscan: 4,
  });

  return (
    <EmojiPicker.Viewport ref={scrollRef} className="relative flex-1">
      <div {...grid.getGridProps({ style: { position: "relative", height: virtualizer.getTotalSize() } })}>
        {virtualizer.getVirtualItems().map((v) => {
          const row = grid.rows[v.index]!;
          return (
            <div key={v.key} role="presentation" className="absolute inset-x-0 grid grid-cols-8 justify-items-center px-1.5" style={{ top: v.start, height: v.size }}>
              {row.type === "header" ? (
                <div {...grid.getHeaderProps(row.section)} className="col-span-full w-full bg-popover px-1 pt-2 pb-1 text-xs font-medium text-muted-foreground" />
              ) : (
                row.items.map((item) => <div key={item.id} {...grid.getCellProps(item)} className="rounded-md outline-none hover:bg-accent focus-visible:bg-accent data-[highlighted]:bg-accent" />)
              )}
            </div>
          );
        })}
      </div>
      {grid.variations}
    </EmojiPicker.Viewport>
  );
}
