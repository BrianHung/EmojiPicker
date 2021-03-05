import React, { FunctionComponent, useEffect, useRef, Ref, useState, memo, forwardRef, MutableRefObject, CSSProperties, MouseEvent } from "react";
import { FixedSizeList as VirtualList } from 'react-window';
import InfiniteLoader from "react-window-infinite-loader";
import { EmojiObject, shallowDiffer, itemRange } from '../utils'
import Emoji from "../Emoji";

type ScrollProps = {
  emojisPerRow: number, 
  emojiSize: number,
  numberScrollRows: number,
  focusedEmoji: {emoji: EmojiObject, row: number, focusOnRender: boolean, preventScroll: boolean} | null,
  emojiData: Record<string, EmojiObject[]>;
  refVirtualList: MutableRefObject<VirtualList>,
  handleClickInScroll: (emoji: EmojiObject, row: number) => ((event: MouseEvent<HTMLLIElement>) => void) | undefined,
  handleMouseInScroll: (emoji: EmojiObject, row: number) => ((event: MouseEvent<HTMLLIElement>) => void) | undefined,
  itemCount: number,
  itemRanges: itemRange[],
  collapseHeightOnSearch: boolean,
}

const Scroll: FunctionComponent<ScrollProps> = ({emojisPerRow, emojiSize, numberScrollRows, focusedEmoji, emojiData, refVirtualList, handleClickInScroll, handleMouseInScroll, itemCount, itemRanges, collapseHeightOnSearch}) => {
  
  const [arrayOfRows, setArrayOfRows] = useState<Record<number, JSX.Element>>({});
  const infiniteLoaderRef = useRef<InfiniteLoader>(null);

  // Keep track of previously focused emoji to avoid re-rendering all rows.
  const prevFocusedEmoji = useRef<{emoji: EmojiObject, row: number} | null>(null);

  // Reset arrayOfRows upon change in data or emojisPerRow.
  useEffect(function resetScrollState() { 
    setArrayOfRows({}); 
    infiniteLoaderRef?.current.resetloadMoreItemsCache();
    prevFocusedEmoji.current = focusedEmoji; // focusedEmoji included in emojiData change render
    refVirtualList?.current.scrollToItem(0);
    loadMoreItems(0, Math.min(numberScrollRows + 6 - 1, itemRanges[itemRanges.length - 1].to));  // minimumBatchSize + threshold - 1
  }, [emojiData, emojisPerRow])

  // Recompute the rows of the next and previous focusedEmoji upon change in focusedEmoji.
  useEffect(function resetRowsWithFocusedEmoji() {
    let prevEmoji = prevFocusedEmoji.current, nextEmoji = focusedEmoji;
    if (prevEmoji == nextEmoji) { return; }
    let rowsToUpdate = new Set([prevEmoji?.row, nextEmoji?.row]);
    Array.from(rowsToUpdate).forEach(row => row && loadMoreItems(row, row))
    prevFocusedEmoji.current = nextEmoji;
    nextEmoji?.row && refVirtualList.current?.scrollToItem(nextEmoji.row);
  }, [focusedEmoji])

  const isItemLoaded  = (index: number): boolean => !!arrayOfRows[index];

  const loadMoreItems = (startIndex: number, endIndex: number) => {
    const nextArrayOfRows = {}
    let i = startIndex, range: itemRange | undefined;
    while (i <= endIndex) {

      range = itemRanges.find(range => range.from <= i && i < range.to);
      if (range === undefined) break;

      for (let rowIndex = i; rowIndex < Math.min(range.to, endIndex + 1); rowIndex++) {
        if (rowIndex == range.from) {
          nextArrayOfRows[rowIndex] = <div className="emoji-picker-category-title">{range.key}</div>
        } else {

          const offset = rowIndex - range.from;
          const row = emojiData[range.key].slice((offset - 1) * emojisPerRow, offset * emojisPerRow)

          nextArrayOfRows[rowIndex] = (
            <ul className="emoji-picker-category-emoji" role="row" aria-rowindex={rowIndex}>
              { row.map((emoji: EmojiObject, colIndex: number) => {
                  const liProps = {
                    key: emoji.unicode, 
                    onClick: handleClickInScroll(emoji, rowIndex), 
                    onMouseMove: handleMouseInScroll(emoji, rowIndex), 
                    role: "gridcell", 
                    "aria-rowindex": rowIndex,
                    "aria-colindex": colIndex,
                    tabIndex: -1,
                    ...emoji === focusedEmoji?.emoji && {
                      tabIndex: 0,
                      ref: (li: HTMLLIElement) => focusedEmoji.focusOnRender && li?.focus({preventScroll: focusedEmoji.preventScroll}),
                    }
                  }
                  const emojiProps = {
                    emoji,
                    ...emoji === focusedEmoji?.emoji && {
                      className: "emoji-picker-emoji-focused",
                    }
                  }
                  return (
                    <li {...liProps}>
                      <Emoji {...emojiProps}/>
                    </li>
                  )
                }) 
              }
            </ul>
          )
        }
      }
      i = range.to;
    }
    setArrayOfRows(prev => Object.assign({}, prev, nextArrayOfRows));
  }

  return (
    <InfiniteLoader 
      ref={infiniteLoaderRef}
      itemCount={itemCount}
      loadMoreItems={loadMoreItems}
      isItemLoaded={isItemLoaded}
      minimumBatchSize={numberScrollRows}
      threshold={6}
    >
      {({onItemsRendered, ref}) => (
        <VirtualList 
          onItemsRendered={onItemsRendered} 
          ref={list => {ref(list); refVirtualList && (refVirtualList.current = list);}}
          itemCount={itemCount} 
          itemData={arrayOfRows}
          itemSize={emojiSize} 
          height={collapseHeightOnSearch ? Math.min(itemCount * emojiSize + 9, numberScrollRows * emojiSize) : numberScrollRows * emojiSize}
          innerElementType={innerElementType}
        >
          {MemoizedRow}
        </VirtualList>
      )}
    </InfiniteLoader>
  )
}

const MemoizedScroll = memo(Scroll, function ScrollPropsAreEqual(prevProps, nextProps) {
  return prevProps.focusedEmoji?.emoji == nextProps.focusedEmoji?.emoji
      && prevProps.emojiData == nextProps.emojiData
      && prevProps.collapseHeightOnSearch == nextProps.collapseHeightOnSearch
      && prevProps.emojiSize == nextProps.emojiSize
      && prevProps.emojisPerRow == nextProps.emojisPerRow;
})
export default MemoizedScroll;

const VirtualRow: FunctionComponent<{index: number, style: CSSProperties, data}> = ({index, style, data}) => {
  return (
    <div className="emoji-picker-virtual-row" style={style}>
      {data[index]}
    </div>
  )
}

/**
 * memoize rows of the virtualList, only re-rendering when changing in data[index]
 */
const MemoizedRow = memo(VirtualRow, function compareRowProps(prevProps, nextProps) {
  const { style: prevStyle, data: prevData, index: prevIndex, ...prevRest } = prevProps;
  const { style: nextStyle, data: nextData, index: nextIndex, ...nextRest } = nextProps;
  return prevData[prevIndex] === nextData[nextIndex] && !shallowDiffer(prevStyle, nextStyle) && !shallowDiffer(prevRest, nextRest)
})


/**
 * adds padding to the bottom of virtual list
 * See: https://github.com/bvaughn/react-window#can-i-add-padding-to-the-top-and-bottom-of-a-list
 */
const LIST_PADDING_SIZE = 9;
const innerElementType = forwardRef(({style, ...props }: {style: CSSProperties}, ref: Ref<VirtualList>) => (
  // @ts-ignore
  <div ref={ref} style={{...style, height: `${parseFloat(style.height) + LIST_PADDING_SIZE}px`}} 
    {...props}
  />
));