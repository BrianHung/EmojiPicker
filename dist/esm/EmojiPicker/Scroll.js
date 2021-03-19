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
const Scroll = ({ emojisPerRow, emojiSize, numberScrollRows, focusedEmoji, emojiData, refVirtualList, handleClickInScroll, handleMouseInScroll, itemCount, itemRanges, collapseHeightOnSearch }) => {
    const [arrayOfRows, setArrayOfRows] = useState({});
    const infiniteLoaderRef = useRef(null);
    const prevFocusedEmoji = useRef(null);
    useEffect(function resetScrollState() {
        setArrayOfRows({});
        infiniteLoaderRef === null || infiniteLoaderRef === void 0 ? void 0 : infiniteLoaderRef.current.resetloadMoreItemsCache();
        prevFocusedEmoji.current = focusedEmoji;
        refVirtualList === null || refVirtualList === void 0 ? void 0 : refVirtualList.current.scrollToItem(0);
        loadMoreItems(0, Math.min(numberScrollRows + 10 - 1, itemRanges[itemRanges.length - 1].to));
    }, [emojiData, emojisPerRow]);
    useEffect(function resetRowsWithFocusedEmoji() {
        var _a;
        let prevEmoji = prevFocusedEmoji.current, nextEmoji = focusedEmoji;
        if (prevEmoji == nextEmoji) {
            return;
        }
        let rowsToUpdate = new Set([prevEmoji === null || prevEmoji === void 0 ? void 0 : prevEmoji.row, nextEmoji === null || nextEmoji === void 0 ? void 0 : nextEmoji.row]);
        Array.from(rowsToUpdate).forEach(row => row && loadMoreItems(row, row));
        prevFocusedEmoji.current = nextEmoji;
        (nextEmoji === null || nextEmoji === void 0 ? void 0 : nextEmoji.row) && ((_a = refVirtualList.current) === null || _a === void 0 ? void 0 : _a.scrollToItem(nextEmoji.row));
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
                    nextArrayOfRows[rowIndex] = React.createElement("div", { className: "emoji-picker-category-title", "aria-rowindex": rowIndex + 1, "aria-colindex": 1 }, range.key);
                }
                else {
                    const offset = rowIndex - range.from;
                    const row = emojiData[range.key].slice((offset - 1) * emojisPerRow, offset * emojisPerRow);
                    nextArrayOfRows[rowIndex] = (React.createElement("ul", { className: "emoji-picker-category-emoji", role: "row", "aria-rowindex": rowIndex + 1 }, row.map((emoji, colIndex) => {
                        const liProps = Object.assign({ key: emoji.unicode, onClick: handleClickInScroll(emoji, rowIndex), onMouseMove: handleMouseInScroll(emoji, rowIndex), role: "gridcell", "aria-rowindex": rowIndex + 1, "aria-colindex": colIndex + 1, tabIndex: -1 }, emoji === (focusedEmoji === null || focusedEmoji === void 0 ? void 0 : focusedEmoji.emoji) && {
                            tabIndex: 0,
                            ref: (li) => focusedEmoji.focusOnRender && (li === null || li === void 0 ? void 0 : li.focus({ preventScroll: focusedEmoji.preventScroll })),
                        });
                        const emojiProps = Object.assign({ emoji }, emoji === (focusedEmoji === null || focusedEmoji === void 0 ? void 0 : focusedEmoji.emoji) && {
                            className: "emoji-picker-emoji-focused",
                        });
                        return (React.createElement("li", Object.assign({}, liProps),
                            React.createElement(Emoji, Object.assign({}, emojiProps))));
                    })));
                }
            }
            i = range.to;
        }
        setArrayOfRows(prev => Object.assign({}, prev, nextArrayOfRows));
    };
    return (React.createElement(InfiniteLoader, { ref: infiniteLoaderRef, itemCount: itemCount, loadMoreItems: loadMoreItems, isItemLoaded: isItemLoaded, minimumBatchSize: numberScrollRows, threshold: 10 }, ({ onItemsRendered, ref }) => (React.createElement(VirtualList, { onItemsRendered: onItemsRendered, ref: list => { ref(list); refVirtualList && (refVirtualList.current = list); }, itemCount: itemCount, itemData: arrayOfRows, itemSize: emojiSize, height: collapseHeightOnSearch ? Math.min(itemCount * emojiSize + 9, numberScrollRows * emojiSize) : numberScrollRows * emojiSize, innerElementType: innerElementType }, MemoizedRow))));
};
const MemoizedScroll = memo(Scroll, function ScrollPropsAreEqual(prevProps, nextProps) {
    var _a, _b;
    return ((_a = prevProps.focusedEmoji) === null || _a === void 0 ? void 0 : _a.emoji) == ((_b = nextProps.focusedEmoji) === null || _b === void 0 ? void 0 : _b.emoji)
        && prevProps.emojiData == nextProps.emojiData
        && prevProps.collapseHeightOnSearch == nextProps.collapseHeightOnSearch
        && prevProps.emojiSize == nextProps.emojiSize
        && prevProps.emojisPerRow == nextProps.emojisPerRow;
});
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