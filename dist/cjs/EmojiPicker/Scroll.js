"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const react_window_1 = require("react-window");
const react_window_infinite_loader_1 = __importDefault(require("react-window-infinite-loader"));
const utils_1 = require("../utils");
const Emoji_1 = __importDefault(require("../Emoji"));
const Scroll = ({ emojisPerRow, emojiSize, focusedEmoji, emojiData, refVirtualList, handleClickInScroll, handleMouseInScroll, itemCount, itemRanges, collapseHeightOnSearch }) => {
    const [arrayOfRows, setArrayOfRows] = react_1.useState({});
    const infiniteLoaderRef = react_1.useRef(null);
    const prevFocusedEmoji = react_1.useRef(null);
    react_1.useEffect(function resetScrollState() {
        setArrayOfRows({});
        infiniteLoaderRef.current && infiniteLoaderRef.current.resetloadMoreItemsCache();
        prevFocusedEmoji.current = null;
        loadMoreItems(0, 17);
        refVirtualList && refVirtualList.current.scrollToItem(0);
    }, [emojiData, emojisPerRow]);
    react_1.useEffect(function resetRowsWithFocusedEmoji() {
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
                    nextArrayOfRows[rowIndex] = react_1.default.createElement("div", { className: "emoji-picker-category-title" }, range.key);
                }
                else {
                    const offset = rowIndex - range.from;
                    const row = emojiData[range.key].slice((offset - 1) * emojisPerRow, offset * emojisPerRow);
                    nextArrayOfRows[rowIndex] = (react_1.default.createElement("div", { className: "emoji-picker-category-emoji", role: "row", "aria-rowindex": rowIndex }, row.map((emoji, colIndex) => {
                        const emojiProps = Object.assign({ emoji, key: emoji.unicode, onClick: handleClickInScroll(emoji, rowIndex), onMouseMove: handleMouseInScroll(emoji, rowIndex), role: "gridcell", "aria-rowindex": rowIndex, "aria-colindex": colIndex, className: "emoji-picker-emoji", tabIndex: -1 }, (focusedEmoji && emoji === focusedEmoji.emoji) && {
                            className: "emoji-picker-emoji emoji-picker-emoji-focused",
                            tabIndex: 0,
                            ref: (span) => { focusedEmoji.focusOnRender && span && span.focus(); }
                        });
                        return react_1.default.createElement(Emoji_1.default, Object.assign({}, emojiProps));
                    })));
                }
            }
            i = range.to;
        }
        setArrayOfRows(prev => Object.assign({}, prev, nextArrayOfRows));
    };
    return (react_1.default.createElement(react_window_infinite_loader_1.default, { ref: infiniteLoaderRef, itemCount: itemCount, loadMoreItems: loadMoreItems, isItemLoaded: isItemLoaded, minimumBatchSize: 12, threshold: 6 }, ({ onItemsRendered, ref }) => (react_1.default.createElement(react_window_1.FixedSizeList, { onItemsRendered: onItemsRendered, ref: list => { ref(list); refVirtualList && (refVirtualList.current = list); }, itemCount: itemCount, itemData: arrayOfRows, itemSize: emojiSize, height: collapseHeightOnSearch ? Math.min(itemCount * emojiSize + 9, 12 * emojiSize) : 12 * emojiSize, innerElementType: innerElementType }, MemoizedRow))));
};
const MemoizedScroll = react_1.memo(Scroll);
exports.default = MemoizedScroll;
const VirtualRow = ({ index, style, data }) => {
    return (react_1.default.createElement("div", { className: "emoji-picker-virtual-row", style: style }, data[index]));
};
const MemoizedRow = react_1.memo(VirtualRow, function compareRowProps(prevProps, nextProps) {
    const { style: prevStyle, data: prevData, index: prevIndex } = prevProps, prevRest = __rest(prevProps, ["style", "data", "index"]);
    const { style: nextStyle, data: nextData, index: nextIndex } = nextProps, nextRest = __rest(nextProps, ["style", "data", "index"]);
    return prevData[prevIndex] === nextData[nextIndex] && !utils_1.shallowDiffer(prevStyle, nextStyle) && !utils_1.shallowDiffer(prevRest, nextRest);
});
const LIST_PADDING_SIZE = 9;
const innerElementType = react_1.forwardRef((_a, ref) => {
    var { style } = _a, props = __rest(_a, ["style"]);
    return (react_1.default.createElement("div", Object.assign({ ref: ref, style: Object.assign(Object.assign({}, style), { height: `${parseFloat(style.height) + LIST_PADDING_SIZE}px` }) }, props)));
});
//# sourceMappingURL=Scroll.js.map