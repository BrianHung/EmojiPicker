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
import React from "react";
import { FixedSizeList as VirtualList } from 'react-window';
import InfiniteLoader from "react-window-infinite-loader";
import { shallowDiffer } from '../utils';
import Emoji from "../Emoji";
const Scroll = ({ emojisPerRow, focusedEmoji, emojiData, refVirtualList, handleClickInScroll, handleMouseInScroll, itemCount, itemRanges }) => {
    const [arrayOfRows, setArrayOfRows] = React.useState({});
    const [rowStatuses, setRowStatuses] = React.useState({});
    const [unicodeRows, setUnicodeRows] = React.useState({});
    const infiniteLoaderRef = React.useRef(null);
    React.useEffect(() => {
        setArrayOfRows({});
        setRowStatuses({});
        setUnicodeRows({});
        infiniteLoaderRef.current && infiniteLoaderRef.current.resetloadMoreItemsCache();
        loadMoreItems(0, 13);
        refVirtualList && refVirtualList.current.scrollToItem(0);
        prevFocused.current = null;
    }, [emojiData, emojisPerRow]);
    const isFocusedEmoji = (emoji) => !!focusedEmoji && emoji.name === focusedEmoji.name;
    const loadMoreItems = (startIndex, endIndex) => {
        let itemRange, i = startIndex;
        const newUnicodeRows = {};
        const newArrayOfRows = {};
        const newRowStatuses = {};
        while (i <= endIndex) {
            itemRange = itemRanges.find(range => range.from <= i && i < range.to);
            if (itemRange === undefined)
                break;
            for (let j = i; j < Math.min(itemRange.to, endIndex + 1); j++) {
                if (j == itemRange.from) {
                    newArrayOfRows[j] = React.createElement("div", { className: "emoji-picker-category-title" }, itemRange.key);
                }
                else {
                    const offset = j - itemRange.from;
                    const row = emojiData[itemRange.key].slice((offset - 1) * emojisPerRow, offset * emojisPerRow);
                    newArrayOfRows[j] =
                        React.createElement("div", { className: "emoji-picker-category-emoji", role: "row" }, row.map((emoji) => {
                            newUnicodeRows[emoji.unicode] = j;
                            const emojiProps = Object.assign({ emoji, key: emoji.unicode, onClick: handleClickInScroll(emoji), onMouseMove: handleMouseInScroll(emoji), role: "gridcell", className: "emoji-picker-emoji", tabIndex: -1 }, isFocusedEmoji(emoji) && {
                                className: "emoji-picker-emoji emoji-picker-emoji-focused",
                                tabIndex: 0,
                                ref: span => { isFocusedEmoji(emoji) && prevFocused.current && span && span.focus(); }
                            });
                            return React.createElement(Emoji, Object.assign({}, emojiProps));
                        }));
                }
                newRowStatuses[j] = true;
            }
            i = itemRange.to;
        }
        setArrayOfRows(prev => (Object.assign(Object.assign({}, prev), newArrayOfRows)));
        setRowStatuses(prev => (Object.assign(Object.assign({}, prev), newRowStatuses)));
        setUnicodeRows(prev => (Object.assign(Object.assign({}, prev), newUnicodeRows)));
    };
    const prevFocused = React.useRef(null);
    React.useEffect(() => {
        const rowsToUpdate = new Set();
        let prevRow = prevFocused.current && unicodeRows[prevFocused.current.unicode];
        !!prevRow && rowsToUpdate.add(prevRow);
        let nextRow = focusedEmoji && unicodeRows[focusedEmoji.unicode];
        !!nextRow && rowsToUpdate.add(nextRow);
        Array.from(rowsToUpdate).forEach(row => row && loadMoreItems(row, row));
        refVirtualList && nextRow && refVirtualList.current.scrollToItem(nextRow);
        prevFocused.current = focusedEmoji;
    }, [focusedEmoji]);
    const isItemLoaded = (index) => !!rowStatuses[index];
    return (React.createElement(InfiniteLoader, { ref: infiniteLoaderRef, itemCount: itemCount, loadMoreItems: loadMoreItems, isItemLoaded: isItemLoaded, minimumBatchSize: 11, threshold: 2 }, ({ onItemsRendered, ref }) => (React.createElement(VirtualList, { ref: list => { ref(list); refVirtualList && (refVirtualList.current = list); }, itemCount: itemCount, itemData: arrayOfRows, onItemsRendered: onItemsRendered, itemSize: 36, height: Math.min(itemCount * 36, 432) }, MemoizedRow))));
};
const VirtualRow = ({ index, style, data }) => {
    return (React.createElement("div", { className: "emoji-picker-virtual-row", style: style }, data[index]));
};
const MemoizedRow = React.memo(VirtualRow, (prevProps, nextProps) => {
    const { style: prevStyle, data: prevData, index: prevIndex } = prevProps, prevRest = __rest(prevProps, ["style", "data", "index"]);
    const { style: nextStyle, data: nextData, index: nextIndex } = nextProps, nextRest = __rest(nextProps, ["style", "data", "index"]);
    return prevData[prevIndex] === nextData[nextIndex] && !shallowDiffer(prevStyle, nextStyle) && !shallowDiffer(prevRest, nextRest);
});
const MemoizedScroll = React.memo(Scroll);
export default MemoizedScroll;
