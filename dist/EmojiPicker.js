import React, { useState, useImperativeHandle } from "react";
import * as Fuse from 'fuse.js';
import { measureScrollbar, calcCountAndRange } from './utils';
import "./EmojiPicker.css";
import Navbar from "./EmojiPicker/Navbar";
import Footer from "./EmojiPicker/Footer";
import Scroll from "./EmojiPicker/Scroll";
const defaultEmojiPickerProps = {
    emojiData: {},
    handleEmojiSelect: (emoji) => console.log(emoji),
    showNavbar: false,
    showFooter: false,
    showScroll: true,
    emojisPerRow: 9,
};
export const EmojiPicker = React.forwardRef(function EmojiPickerComponent({ emojiData, handleEmojiSelect, showNavbar, showFooter, showScroll, emojisPerRow = 9 }, ref) {
    const [query, setQuery] = useState("");
    const [focusedEmoji, setFocusedEmoji] = useState(Object.values(emojiData).flat()[0]);
    const [searchEmojis, setSearchemojis] = useState(Object.keys(emojiData).reduce((sum, category) => Object.assign(sum, { [category]: [] }), {}));
    const { itemCount, itemRanges } = React.useMemo(() => calcCountAndRange(query !== "" ? searchEmojis : emojiData, emojisPerRow), [query, emojisPerRow]);
    const [emojiIndex] = useState(new Fuse.default(Object.values(emojiData).flat(), {
        threshold: 0.10,
        keys: [{ name: "name", weight: 0.70 }, { name: "keywords", weight: 0.30 }]
    }));
    const search = (query) => {
        setQuery(query);
        if (query === "") {
            setSearchemojis(Object.keys(emojiData).reduce((sum, category) => Object.assign(sum, { [category]: [] }), {}));
        }
        else {
            const filter = emojiIndex.search(query).map((result) => result.item);
            setSearchemojis(Object.entries(emojiData)
                .map(([category, list]) => ([category, list.filter(e => filter.includes(e))]))
                .reduce((sum, [category, list]) => Object.assign(sum, { [category]: list }), {}));
        }
    };
    useImperativeHandle(ref, () => {
        return {
            search: (query) => search(query),
            emojis: query === "" ? emojiData : searchEmojis,
            handleKeyDownScroll: handleKeyDownScroll,
        };
    });
    const handleClickInScroll = (emoji) => (event) => {
        handleEmojiSelect(emoji);
    };
    const handleMouseInScroll = (emoji) => (event) => {
        if (event.movementX === 0 && event.movementY === 0)
            return;
        emoji !== focusedEmoji && setFocusedEmoji(emoji);
    };
    const handleKeyDownScroll = (event) => {
        let emojis = Object.values(query === "" ? emojiData : searchEmojis).filter(array => array.length !== 0);
        let arrayIndex, arrayEmoji, emojiIndex, newEmoji;
        switch (event.key) {
            case "Enter":
                event.preventDefault();
                focusedEmoji !== null && handleEmojiSelect(focusedEmoji);
                break;
            case "ArrowUp":
                event.preventDefault();
                emojis.find((array, index) => { emojiIndex = array.findIndex(emoji => emoji === focusedEmoji), arrayIndex = index, arrayEmoji = array; return emojiIndex !== -1; });
                if (emojiIndex !== -1) {
                    let newIndex = emojiIndex - emojisPerRow;
                    if (newIndex >= 0) {
                        newEmoji = arrayEmoji[newIndex];
                    }
                    else if (arrayIndex !== 0) {
                        let arrayAbove = emojis[arrayIndex - 1];
                        let modIndex = emojiIndex % emojisPerRow;
                        newEmoji = arrayAbove[Math.floor((arrayAbove.length - 1 - modIndex) / emojisPerRow) * emojisPerRow + modIndex] || arrayAbove[arrayAbove.length - 1];
                        console.log("hi", newEmoji, arrayAbove, arrayIndex, emojis, modIndex);
                    }
                }
                break;
            case "ArrowDown":
                event.preventDefault();
                emojis.filter(array => array.length !== 0).find((array, index) => { emojiIndex = array.findIndex(emoji => emoji === focusedEmoji), arrayIndex = index, arrayEmoji = array; return emojiIndex !== -1; });
                if (emojiIndex !== -1) {
                    let newIndex = emojiIndex + emojisPerRow;
                    if (newIndex < arrayEmoji.length) {
                        newEmoji = arrayEmoji[newIndex];
                    }
                    else if (arrayIndex !== emojis.length - 1) {
                        let arrayBelow = emojis[arrayIndex + 1];
                        let modIndex = emojiIndex % emojisPerRow;
                        newEmoji = arrayBelow[modIndex] || arrayBelow[0];
                    }
                }
                break;
            case "ArrowLeft":
                event.preventDefault();
                emojis.filter(array => array.length !== 0).find((array, index) => { emojiIndex = array.findIndex(emoji => emoji === focusedEmoji), arrayIndex = index, arrayEmoji = array; return emojiIndex !== -1; });
                if (emojiIndex !== -1) {
                    let newIndex = emojiIndex - 1;
                    if (newIndex >= 0) {
                        newEmoji = arrayEmoji[newIndex];
                    }
                    else if (arrayIndex !== 0) {
                        let arrayAbove = emojis[arrayIndex - 1];
                        newEmoji = arrayAbove[arrayAbove.length - 1];
                    }
                }
                break;
            case "ArrowRight":
                event.preventDefault();
                emojis.filter(array => array.length !== 0).find((array, index) => { emojiIndex = array.findIndex(emoji => emoji === focusedEmoji), arrayIndex = index, arrayEmoji = array; return emojiIndex !== -1; });
                if (emojiIndex !== -1) {
                    let newIndex = emojiIndex + 1;
                    if (newIndex < arrayEmoji.length) {
                        newEmoji = arrayEmoji[newIndex];
                    }
                    else if (arrayIndex !== emojis.length - 1) {
                        let arrayBelow = emojis[arrayIndex + 1];
                        newEmoji = arrayBelow[0];
                    }
                }
                break;
        }
        newEmoji && setFocusedEmoji(newEmoji);
    };
    const refVirtualList = React.useRef(null);
    const ScrollProps = {
        emojisPerRow: emojisPerRow,
        focusedEmoji,
        refVirtualList,
        handleClickInScroll,
        handleMouseInScroll,
        itemCount,
        itemRanges,
    };
    const handleClickInNavbar = (category) => (event) => {
        let virtualList = refVirtualList.current;
        if (virtualList !== null) {
            let range = itemRanges.find(range => range.key === category);
            range && virtualList.scrollToItem(range.from, "start");
        }
    };
    const themeClass = React.useMemo(() => {
        let darkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return darkMode ? "emoji-picker emoji-picker-dark" : "emoji-picker";
    }, []);
    const styleWidth = React.useMemo(() => {
        return `calc(36px * ${emojisPerRow} + 1em + ${measureScrollbar()}px + 1px)`;
    }, []);
    return (React.createElement("div", { className: themeClass, style: { width: styleWidth } },
        showNavbar && React.createElement(Navbar, { data: emojiData, handleClickInNavbar: handleClickInNavbar }),
        React.createElement("div", { className: "emoji-picker-scroll", role: "grid", onKeyDown: handleKeyDownScroll }, query !== ""
            ? searchEmojis !== undefined && Object.values(searchEmojis).flat().length !== 0
                ? React.createElement(Scroll, Object.assign({}, ScrollProps, { emojiData: searchEmojis }))
                : React.createElement("div", { className: "emoji-picker-category" },
                    React.createElement("div", { className: "emoji-picker-category-title" }, "No results"))
            : showScroll &&
                React.createElement(Scroll, Object.assign({}, ScrollProps, { emojiData: emojiData }))),
        showFooter && React.createElement(Footer, { emoji: focusedEmoji })));
});
EmojiPicker.defaultProps = defaultEmojiPickerProps;
export default EmojiPicker;
