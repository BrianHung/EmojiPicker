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
const Scroll = ({ emojisPerRow, emojiSize, numberScrollRows, focusedEmoji, emojiData, refVirtualList, handleClickInScroll, handleMouseInScroll, itemCount, itemRanges, collapseHeightOnSearch }) => {
    const [arrayOfRows, setArrayOfRows] = react_1.useState({});
    const infiniteLoaderRef = react_1.useRef(null);
    const prevFocusedEmoji = react_1.useRef(null);
    react_1.useEffect(function resetScrollState() {
        setArrayOfRows({});
        infiniteLoaderRef === null || infiniteLoaderRef === void 0 ? void 0 : infiniteLoaderRef.current.resetloadMoreItemsCache();
        prevFocusedEmoji.current = focusedEmoji;
        refVirtualList === null || refVirtualList === void 0 ? void 0 : refVirtualList.current.scrollToItem(0);
        loadMoreItems(0, Math.min(numberScrollRows + 6 - 1, itemRanges[itemRanges.length - 1].to));
    }, [emojiData, emojisPerRow]);
    react_1.useEffect(function resetRowsWithFocusedEmoji() {
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
                    nextArrayOfRows[rowIndex] = react_1.default.createElement("div", { className: "emoji-picker-category-title" }, range.key);
                }
                else {
                    const offset = rowIndex - range.from;
                    const row = emojiData[range.key].slice((offset - 1) * emojisPerRow, offset * emojisPerRow);
                    nextArrayOfRows[rowIndex] = (react_1.default.createElement("ul", { className: "emoji-picker-category-emoji", role: "row", "aria-rowindex": rowIndex }, row.map((emoji, colIndex) => {
                        const liProps = Object.assign({ key: emoji.unicode, onClick: handleClickInScroll(emoji, rowIndex), onMouseMove: handleMouseInScroll(emoji, rowIndex), role: "gridcell", "aria-rowindex": rowIndex, "aria-colindex": colIndex, tabIndex: -1 }, emoji === (focusedEmoji === null || focusedEmoji === void 0 ? void 0 : focusedEmoji.emoji) && {
                            tabIndex: 0,
                            ref: (li) => focusedEmoji.focusOnRender && (li === null || li === void 0 ? void 0 : li.focus({ preventScroll: focusedEmoji.preventScroll })),
                        });
                        const emojiProps = Object.assign({ emoji }, emoji === (focusedEmoji === null || focusedEmoji === void 0 ? void 0 : focusedEmoji.emoji) && {
                            className: "emoji-picker-emoji-focused",
                        });
                        return (react_1.default.createElement("li", Object.assign({}, liProps),
                            react_1.default.createElement(Emoji_1.default, Object.assign({}, emojiProps))));
                    })));
                }
            }
            i = range.to;
        }
        setArrayOfRows(prev => Object.assign({}, prev, nextArrayOfRows));
    };
    return (react_1.default.createElement(react_window_infinite_loader_1.default, { ref: infiniteLoaderRef, itemCount: itemCount, loadMoreItems: loadMoreItems, isItemLoaded: isItemLoaded, minimumBatchSize: numberScrollRows, threshold: 6 }, ({ onItemsRendered, ref }) => (react_1.default.createElement(react_window_1.FixedSizeList, { onItemsRendered: onItemsRendered, ref: list => { ref(list); refVirtualList && (refVirtualList.current = list); }, itemCount: itemCount, itemData: arrayOfRows, itemSize: emojiSize, height: collapseHeightOnSearch ? Math.min(itemCount * emojiSize + 9, numberScrollRows * emojiSize) : numberScrollRows * emojiSize, innerElementType: innerElementType }, MemoizedRow))));
};
const MemoizedScroll = react_1.memo(Scroll, function ScrollPropsAreEqual(prevProps, nextProps) {
    var _a, _b;
    return ((_a = prevProps.focusedEmoji) === null || _a === void 0 ? void 0 : _a.emoji) == ((_b = nextProps.focusedEmoji) === null || _b === void 0 ? void 0 : _b.emoji)
        && prevProps.emojiData == nextProps.emojiData
        && prevProps.collapseHeightOnSearch == nextProps.collapseHeightOnSearch
        && prevProps.emojiSize == nextProps.emojiSize
        && prevProps.emojisPerRow == nextProps.emojisPerRow;
});
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