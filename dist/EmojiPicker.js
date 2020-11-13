import React, { forwardRef, useState, useImperativeHandle, useMemo, useEffect, useRef } from "react";
import * as Fuse from 'fuse.js';
import { measureScrollbar, calcCountAndRange } from './utils';
import "./EmojiPicker.css";
import Navbar from "./EmojiPicker/Navbar";
import Footer from "./EmojiPicker/Footer";
import Scroll from "./EmojiPicker/Scroll";
function EmojiPickerRefComponent({ emojiData = {}, handleEmojiSelect = (emoji) => console.log(emoji), showNavbar = false, showFooter = false, showScroll = true, emojisPerRow = 9, collapseCategoriesOnSearch = true, collapseHeightOnSearch = true }, ref) {
    const [focusedEmoji, setFocusedEmoji] = useState(Object.values(emojiData).flat()[0]);
    const [searchEmojis, setSearchEmojis] = useState(null);
    const { itemCount, itemRanges } = useMemo(() => calcCountAndRange(searchEmojis || emojiData, emojisPerRow), [searchEmojis, emojisPerRow]);
    useEffect(function () {
        const [firstEmoji] = Object.values(searchEmojis || emojiData).flat();
        setFocusedEmoji(firstEmoji);
    }, [searchEmojis]);
    const [emojiIndex] = useState(new Fuse.default(Object.values(emojiData).flat(), {
        threshold: 0.20,
        keys: [{ name: "name", weight: 0.75 }, { name: "keywords", weight: 0.25 }]
    }));
    const search = (query) => {
        if (query === "") {
            setSearchEmojis(null);
        }
        else {
            const results = emojiIndex.search(query).map((result) => result.item);
            if (collapseCategoriesOnSearch) {
                setSearchEmojis({ "Search Results": results });
            }
            else {
                const groupedResults = Object.entries(emojiData).map(([category, list]) => ([category, list.filter(emoji => results.includes(emoji))])).reduce((sum, [category, list]) => Object.assign(sum, { [category]: list }), {});
                setSearchEmojis(groupedResults);
            }
        }
    };
    useImperativeHandle(ref, () => {
        return { search, handleKeyDownScroll, emojis: searchEmojis || emojiData };
    });
    const handleClickInScroll = (emoji) => (event) => {
        handleEmojiSelect(emoji);
    };
    const handleMouseInScroll = (emoji) => (event) => {
        if (event.movementX === 0 && event.movementY === 0 || emoji == focusedEmoji)
            return;
        event.target.focus();
        setFocusedEmoji(emoji);
    };
    const handleKeyDownScroll = (event) => {
        let emojis = Object.values(searchEmojis || emojiData).filter(array => array.length !== 0);
        let arrayIndex, arrayEmoji, emojiIndex, newEmoji;
        switch (event.key) {
            case "Enter":
                event.preventDefault();
                focusedEmoji !== null && handleEmojiSelect(focusedEmoji);
                break;
            case "ArrowUp":
                event.preventDefault();
                emojis.find((array, index) => { emojiIndex = array.findIndex(emoji => emoji === focusedEmoji), arrayIndex = index, arrayEmoji = array; return emojiIndex !== -1; });
                if (emojiIndex != undefined) {
                    let newIndex = emojiIndex - emojisPerRow;
                    if (newIndex >= 0) {
                        newEmoji = arrayEmoji[newIndex];
                    }
                    else if (arrayIndex !== 0) {
                        let arrayAbove = emojis[arrayIndex - 1];
                        let modIndex = emojiIndex % emojisPerRow;
                        newEmoji = arrayAbove[Math.floor((arrayAbove.length - 1 - modIndex) / emojisPerRow) * emojisPerRow + modIndex] || arrayAbove[arrayAbove.length - 1];
                    }
                }
                break;
            case "ArrowDown":
                event.preventDefault();
                emojis.filter(array => array.length !== 0).find((array, index) => { emojiIndex = array.findIndex(emoji => emoji === focusedEmoji), arrayIndex = index, arrayEmoji = array; return emojiIndex !== -1; });
                if (emojiIndex != undefined) {
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
                if (emojiIndex != undefined) {
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
                if (emojiIndex != undefined) {
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
    const refVirtualList = useRef(null);
    const ScrollProps = {
        emojisPerRow: emojisPerRow,
        focusedEmoji,
        refVirtualList,
        handleClickInScroll,
        handleMouseInScroll,
        collapseHeightOnSearch,
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
    const themeClass = useMemo(() => {
        let darkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return darkMode ? "emoji-picker emoji-picker-dark" : "emoji-picker";
    }, []);
    const styleWidth = useMemo(() => {
        return `calc(36px * ${emojisPerRow} + 1em + ${measureScrollbar() + 1}px)`;
    }, []);
    return (React.createElement("div", { className: themeClass, style: { width: styleWidth } },
        showNavbar && React.createElement(Navbar, { data: emojiData, handleClickInNavbar: handleClickInNavbar }),
        React.createElement("div", { className: "emoji-picker-scroll", role: "grid", onKeyDown: handleKeyDownScroll }, searchEmojis
            ? Object.values(searchEmojis).flat().length !== 0
                ? React.createElement(Scroll, Object.assign({}, ScrollProps, { emojiData: searchEmojis }))
                : React.createElement("div", { className: "emoji-picker-category" },
                    React.createElement("div", { className: "emoji-picker-category-title" }, "No results"))
            : showScroll &&
                React.createElement(Scroll, Object.assign({}, ScrollProps, { emojiData: emojiData }))),
        showFooter && React.createElement(Footer, { emoji: focusedEmoji })));
}
export const EmojiPicker = forwardRef(EmojiPickerRefComponent);
