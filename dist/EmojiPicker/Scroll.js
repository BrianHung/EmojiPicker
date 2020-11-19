var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import React, { useEffect, useRef, useState, memo, forwardRef } from "react";
import { FixedSizeList as VirtualList } from 'react-window';
import InfiniteLoader from "react-window-infinite-loader";
import { shallowDiffer } from '../utils';
import Emoji from "../Emoji";
const Scroll = ({ emojisPerRow, emojiSize, focusedEmoji, emojiData, refVirtualList, handleClickInScroll, handleMouseInScroll, itemCount, itemRanges, collapseHeightOnSearch }) => {
    const [arrayOfRows, setArrayOfRows] = useState({});
    const infiniteLoaderRef = useRef(null);
    const prevFocusedEmoji = useRef(null);
    useEffect(function resetScrollState() {
        setArrayOfRows({});
        infiniteLoaderRef.current && infiniteLoaderRef.current.resetloadMoreItemsCache();
        prevFocusedEmoji.current = null;
        loadMoreItems(0, 23);
        refVirtualList && refVirtualList.current.scrollToItem(0);
    }, [emojiData, emojisPerRow]);
    useEffect(function resetRowsWithFocusedEmoji() {
        const prevEmoji = prevFocusedEmoji.current, nextEmoji = focusedEmoji;
        let prevRow = prevEmoji && prevEmoji.row;
        let nextRow = nextEmoji && nextEmoji.row;
        const rowsToUpdate = new Set();
        prevRow && rowsToUpdate.add(prevRow);
        nextRow && rowsToUpdate.add(nextRow);
        Array.from(rowsToUpdate).forEach(row => row && loadMoreItems(row, row));
        nextRow && refVirtualList && refVirtualList.current.scrollToItem(nextRow);
        prevFocusedEmoji.current = nextEmoji;
    }, [focusedEmoji]);
    const isItemLoaded = (index) => !!arrayOfRows[index];
    const loadMoreItems = (startIndex, endIndex) => {
        const nextArrayOfRows = {};
        let i = startIndex, range;
        while (i <= endIndex) {
            range = itemRanges.find(range => range.from <= i && i < range.to);
            if (range === undefined)
                break;
            for (let rowIndex = i; rowIndex < Math.min(range.to, endIndex + 1); rowIndex++) {
                if (rowIndex == range.from) {
                    nextArrayOfRows[rowIndex] = React.createElement("div", { className: "emoji-picker-category-title" }, range.key);
                }
                else {
                    const offset = rowIndex - range.from;
                    const row = emojiData[range.key].slice((offset - 1) * emojisPerRow, offset * emojisPerRow);
                    nextArrayOfRows[rowIndex] = (React.createElement("div", { className: "emoji-picker-category-emoji", role: "row", "aria-rowindex": rowIndex }, row.map((emoji, colIndex) => {
                        const emojiProps = Object.assign({ emoji, key: emoji.unicode, onClick: handleClickInScroll(emoji, rowIndex), onMouseMove: handleMouseInScroll(emoji, rowIndex), role: "gridcell", "aria-rowindex": rowIndex, "aria-colindex": colIndex, className: "emoji-picker-emoji", tabIndex: -1 }, (focusedEmoji && emoji === focusedEmoji.emoji) && {
                            className: "emoji-picker-emoji emoji-picker-emoji-focused",
                            tabIndex: 0,
                            ref: (span) => { var _a; ((_a = document.activeElement) === null || _a === void 0 ? void 0 : _a.closest(".emoji-picker-scroll")) && span && span.focus(); }
                        });
                        return React.createElement(Emoji, Object.assign({}, emojiProps));
                    })));
                }
            }
            i = range.to;
        }
        setArrayOfRows(prev => Object.assign({}, prev, nextArrayOfRows));
    };
    return (React.createElement(InfiniteLoader, { ref: infiniteLoaderRef, itemCount: itemCount, loadMoreItems: loadMoreItems, isItemLoaded: isItemLoaded, minimumBatchSize: 12, threshold: 12 }, ({ onItemsRendered, ref }) => (React.createElement(VirtualList, { onItemsRendered: onItemsRendered, ref: list => { ref(list); refVirtualList && (refVirtualList.current = list); }, itemCount: itemCount, itemData: arrayOfRows, itemSize: emojiSize, height: collapseHeightOnSearch ? Math.min(itemCount * emojiSize + 9, 12 * emojiSize) : 12 * emojiSize, innerElementType: innerElementType }, MemoizedRow))));
};
const MemoizedScroll = memo(Scroll);
export default MemoizedScroll;
const VirtualRow = ({ index, style, data }) => {
    return (React.createElement("div", { className: "emoji-picker-virtual-row", style: style }, data[index]));
};
const MemoizedRow = memo(VirtualRow, function compareRowProps(prevProps, nextProps) {
    const { style: prevStyle, data: prevData, index: prevIndex } = prevProps, prevRest = __rest(prevProps, ["style", "data", "index"]);
    const { style: nextStyle, data: nextData, index: nextIndex } = nextProps, nextRest = __rest(nextProps, ["style", "data", "index"]);
    return prevData[prevIndex] === nextData[nextIndex] && !shallowDiffer(prevStyle, nextStyle) && !shallowDiffer(prevRest, nextRest);
});
const LIST_PADDING_SIZE = 9;
const innerElementType = forwardRef((_a, ref) => {
    var { style } = _a, props = __rest(_a, ["style"]);
    return (React.createElement("div", Object.assign({ ref: ref, style: Object.assign(Object.assign({}, style), { height: `${parseFloat(style.height) + LIST_PADDING_SIZE}px` }) }, props)));
});
//# sourceMappingURL=Scroll.js.map