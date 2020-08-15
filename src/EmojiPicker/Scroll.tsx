import React from "react";
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
}

const Scroll: React.FunctionComponent<ScrollProps> = ({emojisPerRow, focusedEmoji, emojiData, refVirtualList, handleClickInScroll, handleMouseInScroll, itemCount, itemRanges}) => {

  const [arrayOfRows, setArrayOfRows] = React.useState<Record<number, React.ReactNode>>({});
  const [rowStatuses, setRowStatuses] = React.useState<Record<number, boolean>>({});
  const [unicodeRows, setUnicodeRows] = React.useState<Record<string, number>>({});

  // Reset arrayOfRows and rowStatuses if change in data or emojisPerRow. Avoid first render.
  
  const infiniteLoaderRef = React.useRef<InfiniteLoader>(null);

  React.useEffect(() => { 
    setArrayOfRows({}); 
    setRowStatuses({}); 
    setUnicodeRows({}); 
    infiniteLoaderRef.current && infiniteLoaderRef.current.resetloadMoreItemsCache();
    loadMoreItems(0, 13);
    refVirtualList && refVirtualList.current.scrollToItem(0)
    prevFocused.current = null
  }, [emojiData, emojisPerRow])

  const isFocusedEmoji = (emoji: EmojiObject): boolean => !!focusedEmoji && emoji.name === focusedEmoji.name;

  const loadMoreItems = (startIndex: number, endIndex: number) => {

    let itemRange, i = startIndex;

    const newUnicodeRows = {}
    const newArrayOfRows = {}
    const newRowStatuses = {}

    while (i <= endIndex) {

      itemRange = itemRanges.find(range => range.from <= i && i < range.to);
      if (itemRange === undefined) break;

      for (let j = i; j < Math.min(itemRange.to, endIndex + 1); j++) {
        if (j == itemRange.from) {
          newArrayOfRows[j] = <div className="emoji-picker-category-title">{itemRange.key}</div>
        } else {
          const offset = j - itemRange.from;
          const row = emojiData[itemRange.key].slice((offset - 1) * emojisPerRow, offset * emojisPerRow)
          newArrayOfRows[j] =
            <div className="emoji-picker-category-emoji" role="row">
              { row.map((emoji: EmojiObject) => {
                  newUnicodeRows[emoji.unicode] = j
                  const emojiProps = {
                    emoji, 
                    key: emoji.unicode, 
                    onClick: handleClickInScroll(emoji), 
                    onMouseMove: handleMouseInScroll(emoji), 
                    role: "gridcell", 
                    className: "emoji-picker-emoji",
                    tabIndex: -1,
                    ...isFocusedEmoji(emoji) && {
                      className: "emoji-picker-emoji emoji-picker-emoji-focused",
                      tabIndex: 0,
                      ref: span => { isFocusedEmoji(emoji) && prevFocused.current && span && span.focus() }
                    }
                  }
                  return <Emoji {...emojiProps}/>
                }) 
              }
            </div>
        }
        newRowStatuses[j] = true
      }
      i = itemRange.to;
    }

    setArrayOfRows(prev => ({...prev, ...newArrayOfRows}));
    setRowStatuses(prev => ({...prev, ...newRowStatuses}));
    setUnicodeRows(prev => ({...prev, ...newUnicodeRows}));
  }

  // Recompute the rows of the current and previous focusedEmoji if change in focusedEmoji.

  const prevFocused = React.useRef<EmojiObject | null>(null);
  React.useEffect(() => {
    const rowsToUpdate: Set<number> = new Set()
    let prevRow = prevFocused.current && unicodeRows[prevFocused.current.unicode];
    !!prevRow && rowsToUpdate.add(prevRow);
    let nextRow = focusedEmoji && unicodeRows[focusedEmoji.unicode]
    !!nextRow && rowsToUpdate.add(nextRow);
    Array.from(rowsToUpdate).forEach(row => row && loadMoreItems(row, row))
    refVirtualList && nextRow && refVirtualList.current.scrollToItem(nextRow)
    prevFocused.current = focusedEmoji
  }, [focusedEmoji])

  const isItemLoaded = (index: number): boolean => !!rowStatuses[index];

  return (
    <InfiniteLoader ref={infiniteLoaderRef}
      itemCount={itemCount}
      loadMoreItems={loadMoreItems}
      isItemLoaded={isItemLoaded}
      minimumBatchSize={11}
      threshold={2}
    >
      {({onItemsRendered, ref}) => (
        <VirtualList ref={list => { ref(list); refVirtualList && (refVirtualList.current = list); }}
          itemCount={itemCount} 
          itemData={arrayOfRows}
          onItemsRendered={onItemsRendered} 
          itemSize={36} 
          height={Math.min(itemCount * 36, 432)}
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

const MemoizedRow = React.memo(VirtualRow, (prevProps, nextProps) => {
  const { style: prevStyle, data: prevData, index: prevIndex, ...prevRest } = prevProps;
  const { style: nextStyle, data: nextData, index: nextIndex, ...nextRest } = nextProps;
  return prevData[prevIndex] === nextData[nextIndex] && !shallowDiffer(prevStyle, nextStyle) && !shallowDiffer(prevRest, nextRest)
})


const MemoizedScroll = React.memo(Scroll)
export default MemoizedScroll;