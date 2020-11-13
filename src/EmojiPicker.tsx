import React, { forwardRef, useState, useImperativeHandle, useMemo, useEffect, useRef } from "react"
import { FixedSizeList as VirtualList } from 'react-window';
import * as Fuse from 'fuse.js'; 

import { EmojiObject, measureScrollbar, calcCountAndRange, itemRange } from './utils'
import "./EmojiPicker.css"

import Navbar from "./EmojiPicker/Navbar";
import Footer from "./EmojiPicker/Footer";
import Scroll from "./EmojiPicker/Scroll";

type EmojiPickerProps = {
  emojiData: Record<string, EmojiObject[]>;
  handleEmojiSelect: (emoji: EmojiObject) => void,
  showNavbar?: boolean;
  showFooter?: boolean;
  showScroll?: boolean;
  emojisPerRow?: number;
  collapseCategoriesOnSearch?: boolean;
  collapseHeightOnSearch?: boolean;
}

// Define public methods accessible via ref.

export interface EmojiPickerRef {
  search: (query: string) => void;
  emojis: Record<string, EmojiObject[]>;
  handleKeyDownScroll: (event: React.KeyboardEvent<HTMLElement>) => void;
}

function EmojiPickerRefComponent({emojiData = {}, handleEmojiSelect = (emoji: EmojiObject) => console.log(emoji), showNavbar = false, showFooter = false, showScroll = true, emojisPerRow = 9, collapseCategoriesOnSearch = true, collapseHeightOnSearch = true}: EmojiPickerProps, ref: React.Ref<EmojiPickerRef>) {

  // Initialize EmojiPicker state using hooks.

  const [ focusedEmoji, setFocusedEmoji ] = useState<EmojiObject | null>(Object.values(emojiData).flat()[0]);
  const [ searchEmojis, setSearchEmojis ] = useState<Record<string, EmojiObject[]> | null>(null);

  const { itemCount, itemRanges } = useMemo(() => calcCountAndRange(searchEmojis || emojiData, emojisPerRow), [searchEmojis, emojisPerRow]);

  useEffect(function() {
    const [ firstEmoji ] = Object.values(searchEmojis || emojiData).flat()
    setFocusedEmoji(firstEmoji)
  }, [searchEmojis])

  /**
   * TODO: Replace in-memory fuse.js with indexeddb and search index.
   * See as an example: https://github.com/nolanlawson/emoji-picker-element
   */

  const [ emojiIndex ] = useState(
    new Fuse.default(Object.values(emojiData).flat(), { 
      threshold: 0.20, 
      keys: [{name: "name", weight: 0.75}, {name: "keywords", weight: 0.25}]
    })
  );

  const search = (query: string): void => {
    if (query === "") {
      setSearchEmojis(null)
    } else {
      const results = emojiIndex.search(query).map((result: Fuse.default.FuseResult<any>) => result.item);
      if (collapseCategoriesOnSearch) {
        setSearchEmojis({"Search Results": results})
      } else {
        const groupedResults = Object.entries(emojiData).map(([category, list]) => ([category, list.filter(emoji => results.includes(emoji))])).reduce((sum, [category, list]) => Object.assign(sum, {[category as string]: list}), {});
        setSearchEmojis(groupedResults);
      }
    }
  }

  useImperativeHandle(ref, () => {
    return { search, handleKeyDownScroll, emojis: searchEmojis || emojiData } as EmojiPickerRef
  })

  // Define event handlers in scroll element.

  const handleClickInScroll = (emoji: EmojiObject) => (event: React.MouseEvent) => {
    handleEmojiSelect(emoji)
  }
  
  const handleMouseInScroll = (emoji: EmojiObject) => (event: React.MouseEvent) => {
    if (event.movementX === 0 && event.movementY === 0 || emoji == focusedEmoji) return;
    (event.target as HTMLElement).focus()
    setFocusedEmoji(emoji)
  }

  const handleKeyDownScroll = (event: React.KeyboardEvent<HTMLElement>) => {
    let emojis = Object.values(searchEmojis || emojiData).filter(array => array.length !== 0);
    let arrayIndex, arrayEmoji, emojiIndex, newEmoji;
    switch (event.key) {

      case "Enter": 
        event.preventDefault();
        focusedEmoji !== null && handleEmojiSelect(focusedEmoji);
        break;

      case "ArrowUp":
        event.preventDefault();
        emojis.find((array, index) => { emojiIndex = array.findIndex(emoji => emoji === focusedEmoji), arrayIndex = index, arrayEmoji = array; return emojiIndex !== -1;})
        if (emojiIndex != undefined) {
          let newIndex = emojiIndex - emojisPerRow;
          if (newIndex >= 0) { newEmoji = arrayEmoji[newIndex]; }
          else if (arrayIndex !== 0) {
            let arrayAbove = emojis[arrayIndex - 1]
            let modIndex = emojiIndex % emojisPerRow
            newEmoji = arrayAbove[Math.floor((arrayAbove.length - 1 - modIndex) / emojisPerRow) * emojisPerRow + modIndex] || arrayAbove[arrayAbove.length - 1]
          }
        }
        break;

      case "ArrowDown":
        event.preventDefault();
        emojis.filter(array => array.length !== 0).find((array, index) => { emojiIndex = array.findIndex(emoji => emoji === focusedEmoji), arrayIndex = index, arrayEmoji = array; return emojiIndex !== -1;})
        if (emojiIndex != undefined) {
          let newIndex = emojiIndex + emojisPerRow;
          if (newIndex < arrayEmoji.length) { newEmoji = arrayEmoji[newIndex] }
          else if (arrayIndex !== emojis.length - 1) {
            let arrayBelow = emojis[arrayIndex + 1]
            let modIndex = emojiIndex % emojisPerRow
            newEmoji = arrayBelow[modIndex] || arrayBelow[0]
          }
        }
        break;  

      case "ArrowLeft":
        event.preventDefault();
        emojis.filter(array => array.length !== 0).find((array, index) => { emojiIndex = array.findIndex(emoji => emoji === focusedEmoji), arrayIndex = index, arrayEmoji = array; return emojiIndex !== -1;})
        if (emojiIndex != undefined) {
          let newIndex = emojiIndex - 1;
          if (newIndex >= 0) { newEmoji = arrayEmoji[newIndex] }
          else if (arrayIndex !== 0) {
            let arrayAbove = emojis[arrayIndex - 1]
            newEmoji = arrayAbove[arrayAbove.length - 1]
          }
        }
        break;    

      case "ArrowRight":
        event.preventDefault();
        emojis.filter(array => array.length !== 0).find((array, index) => { emojiIndex = array.findIndex(emoji => emoji === focusedEmoji), arrayIndex = index, arrayEmoji = array; return emojiIndex !== -1;})
        if (emojiIndex != undefined) {
          let newIndex = emojiIndex + 1;
          if (newIndex < arrayEmoji.length) { newEmoji = arrayEmoji[newIndex] }
          else if (arrayIndex !== emojis.length - 1) {
            let arrayBelow = emojis[arrayIndex + 1]
            newEmoji = arrayBelow[0]
          }
        }
        break; 
    }

    newEmoji && setFocusedEmoji(newEmoji);
  }

  const refVirtualList = useRef<VirtualList>(null);

  const ScrollProps = {
    emojisPerRow: emojisPerRow!,
    focusedEmoji,
    refVirtualList,
    handleClickInScroll,
    handleMouseInScroll,
    collapseHeightOnSearch,
    itemCount, 
    itemRanges,
  }

  // Define event handlers for click in navbar element.

  const handleClickInNavbar = (category: string) => (event: React.MouseEvent<HTMLElement>) => {
    let virtualList = refVirtualList.current;
    if (virtualList !== null) {
      let range: itemRange | undefined = itemRanges.find(range => range.key === category)
      range && virtualList.scrollToItem(range.from, "start")
    }
  }

  // Memoize computed classes and styles.

  const themeClass = useMemo((): string => {
    let darkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return darkMode ? "emoji-picker emoji-picker-dark" : "emoji-picker"
  }, [])
  
  const styleWidth = useMemo((): string => {
    return `calc(36px * ${emojisPerRow} + 1em + ${measureScrollbar() + 1}px)`
  }, [])

  return (
    <div className={ themeClass } style={{ width: styleWidth }}>
      { showNavbar && <Navbar data={emojiData} handleClickInNavbar={handleClickInNavbar}/> }
      <div className="emoji-picker-scroll" role="grid" onKeyDown={handleKeyDownScroll}>
        { searchEmojis
          ? Object.values(searchEmojis).flat().length !== 0
            ? <Scroll {...ScrollProps} emojiData={searchEmojis}/>
            : <div className="emoji-picker-category">
                <div className="emoji-picker-category-title">No results</div>
              </div>
          : showScroll && 
              <Scroll {...ScrollProps} emojiData={emojiData}/>
        }
      </div>
      { showFooter && <Footer emoji={focusedEmoji}/> }
    </div>
  )
}

export const EmojiPicker = forwardRef(EmojiPickerRefComponent);