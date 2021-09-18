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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmojiPicker = void 0;
const react_1 = __importStar(require("react"));
const utils_1 = require("./utils");
const Navbar_1 = __importDefault(require("./EmojiPicker/Navbar"));
const Footer_1 = __importDefault(require("./EmojiPicker/Footer"));
const Scroll_1 = __importDefault(require("./EmojiPicker/Scroll"));
function EmojiPickerReducer({ emojiData }) {
    return (prevState, nextState) => {
        var _a, _b, _c;
        if (nextState.searchEmojis && prevState.searchEmojis != nextState.searchEmojis) {
            let emojis = (((_a = nextState.searchEmojis) === null || _a === void 0 ? void 0 : _a.query) && ((_b = nextState.searchEmojis) === null || _b === void 0 ? void 0 : _b.emojis)) || emojiData, category = emojis[Object.keys(emojis)[0]];
            let emoji = category[0];
            nextState.focusedEmoji = { row: 1, emoji, focusOnRender: Boolean((_c = document.activeElement) === null || _c === void 0 ? void 0 : _c.closest(".emoji-picker-scroll")), preventScroll: false };
        }
        return Object.assign(Object.assign({}, prevState), nextState);
    };
}
function EmojiPickerRefComponent({ emojiData = {}, emojiSize = 36, numberScrollRows = 12, onEmojiSelect = (emoji) => console.log(emoji), showNavbar = false, showFooter = false, showScroll = true, emojisPerRow = 9, onKeyDownScroll = (event) => null, collapseCategoriesOnSearch = true, collapseHeightOnSearch = true, theme = "system", emojiPreviewName = (emoji) => emoji.name }, ref) {
    var _a, _b;
    const pickerStateReducer = (0, react_1.useCallback)(EmojiPickerReducer({ emojiData }), [emojiData]);
    const [pickerState, setPickerState] = (0, react_1.useReducer)(pickerStateReducer, {
        searchEmojis: { emojis: null, query: "" },
        focusedEmoji: { row: 1, emoji: Object.values(emojiData).flat()[0], focusOnRender: Boolean((_a = document.activeElement) === null || _a === void 0 ? void 0 : _a.closest(".emoji-picker-scroll")), preventScroll: false }
    });
    const { itemCount, itemRanges } = (0, react_1.useMemo)(() => (0, utils_1.calcCountAndRange)(pickerState.searchEmojis.emojis || emojiData, emojisPerRow), [pickerState.searchEmojis, emojisPerRow]);
    const search = (query) => {
        var _a;
        const { searchEmojis } = pickerState;
        if (!query)
            return setPickerState({
                searchEmojis: { emojis: null, query: "" },
                focusedEmoji: { row: 1, emoji: Object.values(emojiData).flat()[0], focusOnRender: Boolean((_a = document.activeElement) === null || _a === void 0 ? void 0 : _a.closest(".emoji-picker-scroll")), preventScroll: false }
            });
        if ((searchEmojis === null || searchEmojis === void 0 ? void 0 : searchEmojis.emojis) && !Object.values(searchEmojis.emojis).flat().length && searchEmojis.query.length < query.length)
            return setPickerState({ searchEmojis: { emojis: searchEmojis.emojis, query } });
        const index = query.length > searchEmojis.query.length && searchEmojis.emojis != null
            ? Object.values(searchEmojis.emojis).flat()
            : Object.values(emojiData).flat();
        let results = index
            .map(emoji => ({ emoji, score: (emoji.keywords || []).map(word => word.indexOf(query) != -1).reduce((a, b) => a + Number(b), Number(emoji.name.indexOf(query) != -1) * 3) }))
            .filter(a => a.score)
            .sort((a, b) => b.score - a.score)
            .map(({ emoji }) => emoji);
        if (collapseCategoriesOnSearch) {
            return setPickerState({ searchEmojis: { emojis: { "Search Results": results }, query } });
        }
        else {
            let grouped = Object.entries(emojiData).map(([category, list]) => ([category, list.filter(emoji => results.includes(emoji))])).reduce((sum, [category, list]) => Object.assign(sum, { [category]: list }), {});
            return setPickerState({ searchEmojis: { emojis: grouped, query } });
        }
    };
    const refVirtualList = (0, react_1.useRef)(null);
    const refScroll = (0, react_1.useRef)(null);
    const handleClickInScroll = (emoji, row) => (event) => {
        event.preventDefault();
        onEmojiSelect(emoji, event);
        setPickerState({ focusedEmoji: { row, emoji, focusOnRender: true, preventScroll: true } });
    };
    const handleMouseInScroll = (emoji, row) => (event) => {
        var _a;
        if (emoji == ((_a = pickerState.focusedEmoji) === null || _a === void 0 ? void 0 : _a.emoji) || event.movementX == 0 && event.movementY == 0)
            return;
        event.preventDefault();
        const isSafari = window.safari !== undefined;
        setPickerState({ focusedEmoji: { row, emoji, focusOnRender: true, preventScroll: true } });
        isSafari && refScroll.current && refScroll.current.focus();
    };
    const handleKeyDownScroll = (event) => {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const { searchEmojis, focusedEmoji } = pickerState;
        const emojis = Object.values(searchEmojis.emojis || emojiData).filter(array => array.length !== 0);
        switch (event.key) {
            case "Enter": {
                event.preventDefault();
                if (!focusedEmoji) {
                    let emoji = Object.values(searchEmojis.emojis || emojiData).flat()[0];
                    emoji && setPickerState({ focusedEmoji: { row: 1, emoji, focusOnRender: Boolean((_a = document.activeElement) === null || _a === void 0 ? void 0 : _a.closest(".emoji-picker-scroll")), preventScroll: false } });
                }
                else {
                    focusedEmoji.emoji && onEmojiSelect(focusedEmoji.emoji, event);
                }
                return;
            }
            case 'Home': {
                event.preventDefault();
                let emoji = undefined, row = undefined;
                let emojis = searchEmojis.emojis || emojiData, category = emojis[Object.keys(emojis)[0]];
                emoji = category[0];
                row = 1;
                return row && emoji && setPickerState({ focusedEmoji: { row, emoji, focusOnRender: Boolean((_b = document.activeElement) === null || _b === void 0 ? void 0 : _b.closest(".emoji-picker-scroll")), preventScroll: false } });
            }
            case 'End': {
                event.preventDefault();
                let emoji = undefined, row = undefined;
                let emojis = searchEmojis.emojis || emojiData, category = emojis[Object.keys(emojis).pop()];
                emoji = category[category.length - 1];
                row = ((_c = itemRanges[itemRanges.length - 1]) === null || _c === void 0 ? void 0 : _c.to) - 1;
                return row && emoji && setPickerState({ focusedEmoji: { row, emoji, focusOnRender: Boolean((_d = document.activeElement) === null || _d === void 0 ? void 0 : _d.closest(".emoji-picker-scroll")), preventScroll: false } });
            }
            case "ArrowUp": {
                event.preventDefault();
                let emoji = undefined, row = undefined;
                if (!focusedEmoji) {
                    emoji = Object.values(searchEmojis.emojis || emojiData).flat()[0];
                    row = 1;
                }
                else {
                    let arrayIndex, arrayEmoji, emojiIndex;
                    emojis.find((array, index) => {
                        emojiIndex = array.findIndex(emoji => emoji === focusedEmoji.emoji), arrayIndex = index, arrayEmoji = array;
                        return emojiIndex !== -1;
                    });
                    if (emojiIndex != undefined) {
                        if (emojiIndex - emojisPerRow >= 0) {
                            emoji = arrayEmoji[emojiIndex - emojisPerRow];
                            row = focusedEmoji.row - 1;
                        }
                        else if (arrayIndex !== 0) {
                            const arrayAbove = emojis[arrayIndex - 1];
                            const index = (emojiIndex > (arrayAbove.length - 1) % emojisPerRow) ? arrayAbove.length - 1 : Math.floor((arrayAbove.length - 1 - emojiIndex) / emojisPerRow) * emojisPerRow + emojiIndex;
                            emoji = arrayAbove[index];
                            row = focusedEmoji.row - 2;
                        }
                    }
                }
                return row && emoji && setPickerState({ focusedEmoji: { row, emoji, focusOnRender: Boolean((_e = document.activeElement) === null || _e === void 0 ? void 0 : _e.closest(".emoji-picker-scroll")), preventScroll: false } });
            }
            case "ArrowDown": {
                event.preventDefault();
                let emoji = undefined, row = undefined;
                if (!focusedEmoji) {
                    emoji = Object.values(searchEmojis.emojis || emojiData).flat()[0];
                    row = 1;
                }
                else {
                    let arrayIndex, arrayEmoji, emojiIndex;
                    emojis.find((array, index) => {
                        emojiIndex = array.findIndex(emoji => emoji === focusedEmoji.emoji), arrayIndex = index, arrayEmoji = array;
                        return emojiIndex !== -1;
                    });
                    if (emojiIndex != undefined) {
                        if (emojiIndex + emojisPerRow < arrayEmoji.length) {
                            emoji = arrayEmoji[emojiIndex + emojisPerRow];
                            row = focusedEmoji.row + 1;
                        }
                        else if (emojiIndex + emojisPerRow < Math.ceil(arrayEmoji.length / emojisPerRow) * emojisPerRow) {
                            emoji = arrayEmoji[arrayEmoji.length - 1];
                            row = focusedEmoji.row + 1;
                        }
                        else if (arrayIndex !== emojis.length - 1) {
                            const arrayBelow = emojis[arrayIndex + 1], modIndex = emojiIndex % emojisPerRow;
                            emoji = arrayBelow[modIndex] || arrayBelow[arrayBelow.length - 1];
                            row = focusedEmoji.row + 2;
                        }
                    }
                }
                return row && emoji && setPickerState({ focusedEmoji: { row, emoji, focusOnRender: Boolean((_f = document.activeElement) === null || _f === void 0 ? void 0 : _f.closest(".emoji-picker-scroll")), preventScroll: false } });
            }
            case "ArrowLeft": {
                event.preventDefault();
                let emoji = undefined, row = undefined;
                if (!focusedEmoji) {
                    emoji = Object.values(searchEmojis.emojis || emojiData).flat()[0];
                    row = 1;
                }
                else {
                    let arrayIndex, arrayEmoji, emojiIndex;
                    emojis.find((array, index) => {
                        emojiIndex = array.findIndex(emoji => emoji === focusedEmoji.emoji), arrayIndex = index, arrayEmoji = array;
                        return emojiIndex !== -1;
                    });
                    if (emojiIndex != undefined) {
                        if (emojiIndex - 1 >= 0) {
                            emoji = arrayEmoji[emojiIndex - 1];
                            row = Math.floor(emojiIndex / emojisPerRow) == Math.floor((emojiIndex - 1) / emojisPerRow) ? focusedEmoji.row : focusedEmoji.row - 1;
                        }
                        else if (arrayIndex !== 0) {
                            const arrayAbove = emojis[arrayIndex - 1];
                            emoji = arrayAbove[arrayAbove.length - 1];
                            row = focusedEmoji.row - 2;
                        }
                    }
                }
                return row && emoji && setPickerState({ focusedEmoji: { row, emoji, focusOnRender: Boolean((_g = document.activeElement) === null || _g === void 0 ? void 0 : _g.closest(".emoji-picker-scroll")), preventScroll: false } });
            }
            case "ArrowRight": {
                event.preventDefault();
                let emoji = undefined, row = undefined;
                if (!focusedEmoji) {
                    emoji = Object.values(searchEmojis.emojis || emojiData).flat()[0];
                    row = 1;
                }
                else {
                    let arrayIndex, arrayEmoji, emojiIndex;
                    emojis.find((array, index) => {
                        emojiIndex = array.findIndex(emoji => emoji === focusedEmoji.emoji), arrayIndex = index, arrayEmoji = array;
                        return emojiIndex !== -1;
                    });
                    if (emojiIndex != undefined) {
                        let newIndex = emojiIndex + 1;
                        if (newIndex < arrayEmoji.length) {
                            emoji = arrayEmoji[newIndex];
                            row = Math.floor(emojiIndex / emojisPerRow) == Math.floor(newIndex / emojisPerRow) ? focusedEmoji.row : focusedEmoji.row + 1;
                        }
                        else if (arrayIndex !== emojis.length - 1) {
                            let arrayBelow = emojis[arrayIndex + 1];
                            emoji = arrayBelow[0];
                            row = focusedEmoji.row + 2;
                        }
                    }
                }
                return row && emoji && setPickerState({ focusedEmoji: { row, emoji, focusOnRender: Boolean((_h = document.activeElement) === null || _h === void 0 ? void 0 : _h.closest(".emoji-picker-scroll")), preventScroll: false } });
            }
            default:
                return onKeyDownScroll(event);
        }
    };
    (0, react_1.useImperativeHandle)(ref, () => {
        var _a;
        return ({
            search,
            handleKeyDownScroll,
            emojis: pickerState.searchEmojis.emojis || emojiData,
            focusedEmoji: (_a = pickerState.focusedEmoji) === null || _a === void 0 ? void 0 : _a.emoji,
        });
    });
    const ScrollProps = {
        emojiData: pickerState.searchEmojis.emojis || emojiData,
        emojisPerRow: emojisPerRow,
        emojiSize,
        numberScrollRows,
        focusedEmoji: pickerState.focusedEmoji,
        refVirtualList,
        handleClickInScroll,
        handleMouseInScroll,
        collapseHeightOnSearch,
        itemCount,
        itemRanges,
    };
    const handleSelectInNavbar = (category) => {
        let virtualList = refVirtualList.current;
        if (virtualList) {
            let range = itemRanges.find(range => range.key === category);
            if (range) {
                setPickerState({ focusedEmoji: { row: range.from + 1, emoji: emojiData[category][0], focusOnRender: false, preventScroll: false } });
                virtualList.scrollToItem(range.from, "start");
            }
        }
    };
    const getWidths = () => {
        const scrollbarWidth = (0, utils_1.measureScrollbar)();
        return {
            scrollbarWidth,
            width: `calc(${emojiSize}px * ${emojisPerRow} + 1em + ${scrollbarWidth}px)`
        };
    };
    const [width, setWidth] = (0, react_1.useState)(getWidths);
    (0, react_1.useLayoutEffect)(() => {
        let resizeWidth = () => setWidth(getWidths);
        window.addEventListener("resize", resizeWidth);
        return () => window.removeEventListener("resize", resizeWidth);
    }, []);
    return (react_1.default.createElement("div", { className: `emoji-picker emoji-picker-${theme}`, style: { width: width.width } },
        showNavbar &&
            react_1.default.createElement(Navbar_1.default, { data: emojiData, handleSelectInNavbar: handleSelectInNavbar, style: { marginRight: width.scrollbarWidth } }),
        react_1.default.createElement("div", { className: "emoji-picker-scroll", role: "grid", "aria-rowcount": itemCount, "aria-colcount": emojisPerRow, onKeyDown: handleKeyDownScroll, ref: refScroll }, pickerState.searchEmojis.emojis
            ? Object.values(pickerState.searchEmojis.emojis).flat().length
                ? react_1.default.createElement(Scroll_1.default, Object.assign({}, ScrollProps))
                : react_1.default.createElement("div", { className: "emoji-picker-category", style: { height: collapseHeightOnSearch ? 'inherit' : '432px' } },
                    react_1.default.createElement("div", { className: "emoji-picker-category-title" }, "No results"))
            : showScroll &&
                react_1.default.createElement(Scroll_1.default, Object.assign({}, ScrollProps))),
        showFooter &&
            react_1.default.createElement(Footer_1.default, { emoji: (_b = pickerState.focusedEmoji) === null || _b === void 0 ? void 0 : _b.emoji, emojiPreviewName: emojiPreviewName })));
}
exports.EmojiPicker = (0, react_1.forwardRef)(EmojiPickerRefComponent);
//# sourceMappingURL=EmojiPicker.js.map