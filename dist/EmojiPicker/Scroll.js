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
import React, { useEffect, useRef, useState, memo } from "react";
import { FixedSizeList as VirtualList } from 'react-window';
import InfiniteLoader from "react-window-infinite-loader";
import { shallowDiffer } from '../utils';
import Emoji from "../Emoji";
const Scroll = ({ emojisPerRow, focusedEmoji, emojiData, refVirtualList, handleClickInScroll, handleMouseInScroll, itemCount, itemRanges, collapseHeightOnSearch }) => {
    const [arrayOfRows, setArrayOfRows] = useState({});
    const [rowStatuses, setRowStatuses] = useState({});
    const [unicodeRows, setUnicodeRows] = useState({});
    const infiniteLoaderRef = useRef(null);
    const prevFocusedEmoji = useRef(null);
    useEffect(function () {
        setArrayOfRows({});
        setRowStatuses({});
        setUnicodeRows({});
        infiniteLoaderRef.current && infiniteLoaderRef.current.resetloadMoreItemsCache();
        prevFocusedEmoji.current = null;
        loadMoreItems(0, 15);
        refVirtualList && refVirtualList.current.scrollToItem(0);
    }, [emojiData, emojisPerRow]);
    useEffect(function () {
        const prevEmoji = prevFocusedEmoji.current, nextEmoji = focusedEmoji;
        let prevRow = prevEmoji && unicodeRows[prevEmoji.unicode];
        let nextRow = nextEmoji && unicodeRows[nextEmoji.unicode];
        const rowsToUpdate = new Set();
        prevRow && rowsToUpdate.add(prevRow);
        nextRow && rowsToUpdate.add(nextRow);
        Array.from(rowsToUpdate).forEach(row => row && loadMoreItems(row, row));
        nextRow && refVirtualList && refVirtualList.current.scrollToItem(nextRow);
        prevFocusedEmoji.current = nextEmoji;
    }, [focusedEmoji]);
    const isFocusedEmoji = (emoji) => !!focusedEmoji && emoji.name === focusedEmoji.name;
    const isItemLoaded = (index) => !!rowStatuses[index];
    const loadMoreItems = (startIndex, endIndex) => {
        const nextUnicodeRows = {};
        const nextArrayOfRows = {};
        const nextRowStatuses = {};
        let i = startIndex, range;
        while (i <= endIndex) {
            range = itemRanges.find(range => range.from <= i && i < range.to);
            if (range === undefined)
                break;
            for (let j = i; j < Math.min(range.to, endIndex + 1); j++) {
                nextRowStatuses[j] = true;
                if (j == range.from) {
                    nextArrayOfRows[j] = React.createElement("div", { className: "emoji-picker-category-title" }, range.key);
                }
                else {
                    const offset = j - range.from;
                    const row = emojiData[range.key].slice((offset - 1) * emojisPerRow, offset * emojisPerRow);
                    nextArrayOfRows[j] = (React.createElement("div", { className: "emoji-picker-category-emoji", role: "row" }, row.map((emoji) => {
                        nextUnicodeRows[emoji.unicode] = j;
                        const emojiProps = Object.assign({ emoji, key: emoji.unicode, onClick: handleClickInScroll(emoji), onMouseMove: handleMouseInScroll(emoji), role: "gridcell", className: "emoji-picker-emoji", tabIndex: -1 }, (focusedEmoji && emoji.name === focusedEmoji.name) && {
                            className: "emoji-picker-emoji emoji-picker-emoji-focused",
                            tabIndex: 0,
                            ref: span => { var _a; ((_a = document.activeElement) === null || _a === void 0 ? void 0 : _a.className.includes("emoji-picker-emoji")) && span && span.focus(); }
                        });
                        return React.createElement(Emoji, Object.assign({}, emojiProps));
                    })));
                }
            }
            i = range.to;
        }
        setArrayOfRows(prev => Object.assign({}, prev, nextArrayOfRows));
        setRowStatuses(prev => Object.assign({}, prev, nextRowStatuses));
        setUnicodeRows(prev => Object.assign({}, prev, nextUnicodeRows));
    };
    return (React.createElement(InfiniteLoader, { ref: infiniteLoaderRef, itemCount: itemCount, loadMoreItems: loadMoreItems, isItemLoaded: isItemLoaded, minimumBatchSize: 11, threshold: 4 }, ({ onItemsRendered, ref }) => (React.createElement(VirtualList, { onItemsRendered: onItemsRendered, ref: list => { ref(list); refVirtualList && (refVirtualList.current = list); }, itemCount: itemCount, itemData: arrayOfRows, itemSize: 36, height: collapseHeightOnSearch ? Math.min(itemCount * 36, 12 * 36) : 12 * 36 }, MemoizedRow))));
};
const VirtualRow = ({ index, style, data }) => {
    return (React.createElement("div", { className: "emoji-picker-virtual-row", style: style }, data[index]));
};
const MemoizedRow = memo(VirtualRow, (prevProps, nextProps) => {
    const { style: prevStyle, data: prevData, index: prevIndex } = prevProps, prevRest = __rest(prevProps, ["style", "data", "index"]);
    const { style: nextStyle, data: nextData, index: nextIndex } = nextProps, nextRest = __rest(nextProps, ["style", "data", "index"]);
    return prevData[prevIndex] === nextData[nextIndex] && !shallowDiffer(prevStyle, nextStyle) && !shallowDiffer(prevRest, nextRest);
});
const MemoizedScroll = memo(Scroll);
export default MemoizedScroll;
