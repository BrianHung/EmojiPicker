import React, { useEffect, useRef, useState, memo } from "react";
import { FixedSizeList as VirtualList } from 'react-window';
import InfiniteLoader from "react-window-infinite-loader";
import { EmojiObject, shallowDiffer, itemRange } from '../utils'
import Emoji from "../Emoji";

type ScrollProps = {
  emojisPerRow: number, 
  focusedEmoji: EmojiObject | null, 
  emojiData: Record<string, EmojiObject[]>;
  refVirtualList: React.MutableRefObject<VirtualList>,
  handleClickInScroll: (emoji: EmojiObject) => void,
  handleMouseInScroll: (emoji: EmojiObject) => void,
  itemCount: number,
  itemRanges: itemRange[],
  collapseHeightOnSearch: boolean,
}

const Scroll: React.FunctionComponent<ScrollProps> = ({emojisPerRow, focusedEmoji, emojiData, refVirtualList, handleClickInScroll, handleMouseInScroll, itemCount, itemRanges, collapseHeightOnSearch}) => {

  const [arrayOfRows, setArrayOfRows] = useState<Record<number, React.ReactNode>>({});
  const [rowStatuses, setRowStatuses] = useState<Record<number, boolean>>({});
  const [unicodeRows, setUnicodeRows] = useState<Record<string, number>>({});

  const infiniteLoaderRef = useRef<InfiniteLoader>(null);
  const prevFocusedEmoji = useRef<EmojiObject|null>(null);

  // Reset arrayOfRows and rowStatuses upon change in data or emojisPerRow.
  useEffect(function() { 
    setArrayOfRows({}); 
    setRowStatuses({}); 
    setUnicodeRows({}); 
    infiniteLoaderRef.current && infiniteLoaderRef.current.resetloadMoreItemsCache();
    prevFocusedEmoji.current = null
    loadMoreItems(0, 15);
    refVirtualList && refVirtualList.current.scrollToItem(0);
  }, [emojiData, emojisPerRow])

  // Recompute the rows of the next and previous focusedEmoji upon change in focusedEmoji.
  useEffect(function() {
    const prevEmoji = prevFocusedEmoji.current, nextEmoji = focusedEmoji;
    let prevRow = prevEmoji && unicodeRows[prevEmoji.unicode];
    let nextRow = nextEmoji && unicodeRows[nextEmoji.unicode];

    const rowsToUpdate: Set<number> = new Set();
    prevRow && rowsToUpdate.add(prevRow);
    nextRow && rowsToUpdate.add(nextRow);
    Array.from(rowsToUpdate).forEach(row => row && loadMoreItems(row, row))

    nextRow && refVirtualList && refVirtualList.current.scrollToItem(nextRow)
    prevFocusedEmoji.current = nextEmoji;
  }, [focusedEmoji])

  const isFocusedEmoji = (emoji: EmojiObject): boolean => !!focusedEmoji && emoji.name === focusedEmoji.name
  const isItemLoaded = (index: number): boolean => !!rowStatuses[index];

  const loadMoreItems = (startIndex: number, endIndex: number) => {
    const nextUnicodeRows = {}
    const nextArrayOfRows = {}
    const nextRowStatuses = {}
    let i = startIndex, range: itemRange | undefined;
    while (i <= endIndex) {

      range = itemRanges.find(range => range.from <= i && i < range.to);
      if (range === undefined) break;

      for (let j = i; j < Math.min(range.to, endIndex + 1); j++) {
        nextRowStatuses[j] = true
        if (j == range.from) {
          nextArrayOfRows[j] = <div className="emoji-picker-category-title">{range.key}</div>
        } else {
          const offset = j - range.from;
          const row = emojiData[range.key].slice((offset - 1) * emojisPerRow, offset * emojisPerRow)

          nextArrayOfRows[j] = (
            <div className="emoji-picker-category-emoji" role="row">
              { row.map((emoji: EmojiObject) => {
                  nextUnicodeRows[emoji.unicode] = j
                  const emojiProps = {
                    emoji, 
                    key: emoji.unicode, 
                    onClick: handleClickInScroll(emoji), 
                    onMouseMove: handleMouseInScroll(emoji), 
                    role: "gridcell", 
                    className: "emoji-picker-emoji",
                    tabIndex: -1,
                    ...(focusedEmoji && emoji.name === focusedEmoji.name) && {
                      className: "emoji-picker-emoji emoji-picker-emoji-focused",
                      tabIndex: 0,
                      ref: span => { document.activeElement?.className.includes("emoji-picker-emoji") && span && span.focus() }
                    }
                  }
                  return <Emoji {...emojiProps}/>
                }) 
              }
            </div>
          )
        }
      }
      i = range.to;
    }
    setArrayOfRows(prev => Object.assign({}, prev, nextArrayOfRows));
    setRowStatuses(prev => Object.assign({}, prev, nextRowStatuses));
    setUnicodeRows(prev => Object.assign({}, prev, nextUnicodeRows));
  }

  return (
    <InfiniteLoader 
      ref={infiniteLoaderRef}
      itemCount={itemCount}
      loadMoreItems={loadMoreItems}
      isItemLoaded={isItemLoaded}
      minimumBatchSize={11}
      threshold={4}
    >
      {({onItemsRendered, ref}) => (
        <VirtualList 
          onItemsRendered={onItemsRendered} 
          ref={list => {ref(list); refVirtualList && (refVirtualList.current = list);}}
          itemCount={itemCount} 
          itemData={arrayOfRows}
          itemSize={36} 
          height={collapseHeightOnSearch ? Math.min(itemCount * 36, 12 * 36) : 12 * 36}
        >
          {MemoizedRow}
        </VirtualList>
      )}
    </InfiniteLoader>
  )
}

const VirtualRow: React.FunctionComponent<{index: number, style: React.CSSProperties, data}> = ({index, style, data}) => {
  return (
    <div className="emoji-picker-virtual-row" style={style}>
      { data[index] }
    </div>
  )
}

// Memoize rows of the virtualList, only re-rendering when changing in data[index].

const MemoizedRow = memo(VirtualRow, (prevProps, nextProps) => {
  const { style: prevStyle, data: prevData, index: prevIndex, ...prevRest } = prevProps;
  const { style: nextStyle, data: nextData, index: nextIndex, ...nextRest } = nextProps;
  return prevData[prevIndex] === nextData[nextIndex] && !shallowDiffer(prevStyle, nextStyle) && !shallowDiffer(prevRest, nextRest)
})


const MemoizedScroll = memo(Scroll)
export default MemoizedScroll;