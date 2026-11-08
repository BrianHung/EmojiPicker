import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { EmojiPicker, useEmojiCell, useEmojiGrid, type EmojiGridState, type EmojiItem } from "emoji-components";

const Cell = React.memo(function Cell({ state, item }: { state: EmojiGridState; item: EmojiItem }) {
  const { cellProps } = useEmojiCell(state, item);
  return <div {...cellProps} className="flex size-9 cursor-default items-center justify-center rounded-md outline-none hover:bg-accent focus-visible:bg-accent data-[highlighted]:bg-accent" />;
});

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
                <div {...grid.getHeaderProps(row.section)} className="col-span-full flex h-7 w-full items-center bg-popover px-1 pt-2 pb-1 text-xs font-medium text-muted-foreground" />
              ) : (
                row.items.map((item) => <Cell key={item.id} state={grid.state} item={item} />)
              )}
            </div>
          );
        })}
      </div>
      {grid.variations}
    </EmojiPicker.Viewport>
  );
}
