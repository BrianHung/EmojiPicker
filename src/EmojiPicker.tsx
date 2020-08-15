import React, { useState, useImperativeHandle } from "react"
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
}

const defaultEmojiPickerProps: EmojiPickerProps = {
  emojiData: {},
  handleEmojiSelect: (emoji: EmojiObject) => console.log(emoji),
  showNavbar: false,
  showFooter: false,
  showScroll: true,
  emojisPerRow: 9,
}

// Define public methods accessible via ref.

export interface EmojiPickerRef {
  search: (query: string) => void;
  emojis: Record<string, EmojiObject[]>;
  handleKeyDownScroll: (event: React.KeyboardEvent<HTMLElement>) => void;
}

export const EmojiPicker = React.forwardRef(function EmojiPickerComponent({emojiData, handleEmojiSelect, showNavbar, showFooter, showScroll, emojisPerRow = 9}: EmojiPickerProps, ref: React.Ref<EmojiPickerRef>) {

  // Initialize EmojiPicker state using hooks.

  const [ query, setQuery ] = useState<string>("");
  const [ focusedEmoji, setFocusedEmoji ] = useState<EmojiObject | null>(Object.values(emojiData).flat()[0]);
  const [ searchEmojis, setSearchemojis ] = useState<Record<string, EmojiObject[]>>(
    Object.keys(emojiData).reduce((sum, category) => Object.assign(sum, {[category as string]: []}), {})
  );

  const { itemCount, itemRanges } = React.useMemo(() => calcCountAndRange(query !== "" ? searchEmojis : emojiData, emojisPerRow), [query, emojisPerRow]);

  /**
   * TODO: Replace in-memory fuse.js with indexeddb and search index.
   * See as an example: https://github.com/nolanlawson/emoji-picker-element
   */

  const [ emojiIndex ] = useState(
    new Fuse.default(Object.values(emojiData).flat(), { 
      threshold: 0.10, 
      keys: [{name: "name", weight: 0.70}, {name: "keywords", weight: 0.30}]
    })
  );

  const search = (query: string): void => {
    setQuery(query)
    if (query === "") {
      setSearchemojis(Object.keys(emojiData).reduce((sum, category) => Object.assign(sum, {[category as string]: []}), {}))
    } else {
      const filter = emojiIndex.search(query).map((result: Fuse.default.FuseResult<any>) => result.item);
      setSearchemojis(Object.entries(emojiData)
        .map(([category, list]) => ([category, list.filter(e => filter.includes(e))]))
        .reduce((sum, [category, list]) => Object.assign(sum, {[category as string]: list}), {})
      )
    }
  }

  useImperativeHandle(ref, () => {
    return {
      search: (query: string) => search(query),
      emojis: query === "" ? emojiData : searchEmojis,
      handleKeyDownScroll: handleKeyDownScroll,
    } as EmojiPickerRef
  })

  // Define event handlers in scroll element.

  const handleClickInScroll = (emoji: EmojiObject) => (event: React.MouseEvent) => {
    handleEmojiSelect(emoji)
  }
  
  const handleMouseInScroll = (emoji: EmojiObject) => (event: React.MouseEvent) => {
    if (event.movementX === 0 && event.movementY === 0) return;
    emoji !== focusedEmoji && setFocusedEmoji(emoji)
  }

  const handleKeyDownScroll = (event: React.KeyboardEvent<HTMLElement>) => {
    let arrayIndex, arrayEmoji, emojiIndex, newEmoji;
    switch (event.key) {

      case "Enter": 
        event.preventDefault();
        focusedEmoji !== null && handleEmojiSelect(focusedEmoji);
        break;

      case "ArrowUp":
        event.preventDefault();
        Object.values(emojiData).find((array, index) => { emojiIndex = array.findIndex(emoji => emoji === focusedEmoji), arrayIndex = index, arrayEmoji = array; return emojiIndex !== -1;})
        if (emojiIndex !== -1) {
          let newIndex = emojiIndex - emojisPerRow;
          if (newIndex >= 0) { newEmoji = arrayEmoji[newIndex]; }
          else if (arrayIndex !== 0) {
            let arrayAbove = Object.values(emojiData)[arrayIndex - 1]
            let modIndex = emojiIndex % emojisPerRow
            newEmoji = arrayAbove[Math.floor((arrayAbove.length - 1 - modIndex) / emojisPerRow) * emojisPerRow + modIndex]
          }
        }
        break;

      case "ArrowDown":
        event.preventDefault();
        Object.values(emojiData).find((array, index) => { emojiIndex = array.findIndex(emoji => emoji === focusedEmoji), arrayIndex = index, arrayEmoji = array; return emojiIndex !== -1;})
        if (emojiIndex !== -1) {
          let newIndex = emojiIndex + emojisPerRow;
          if (newIndex < arrayEmoji.length) { newEmoji = arrayEmoji[newIndex] }
          else if (arrayIndex !== Object.keys(emojiData).length - 1) {
            let arrayBelow = Object.values(emojiData)[arrayIndex + 1]
            let modIndex = emojiIndex % emojisPerRow
            newEmoji = arrayBelow[modIndex]
          }
        }
        break;  

      case "ArrowLeft":
        event.preventDefault();
        Object.values(emojiData).find((array, index) => { emojiIndex = array.findIndex(emoji => emoji === focusedEmoji), arrayIndex = index, arrayEmoji = array; return emojiIndex !== -1;})
        if (emojiIndex !== -1) {
          let newIndex = emojiIndex - 1;
          if (newIndex >= 0) { newEmoji = arrayEmoji[newIndex] }
          else if (arrayIndex !== 0) {
            let arrayAbove = Object.values(emojiData)[arrayIndex - 1]
            newEmoji = arrayAbove[arrayAbove.length - 1]
          }
        }
        break;    

      case "ArrowRight":
        event.preventDefault();
        Object.values(emojiData).find((array, index) => { emojiIndex = array.findIndex(emoji => emoji === focusedEmoji), arrayIndex = index, arrayEmoji = array; return emojiIndex !== -1;})
        if (emojiIndex !== -1) {
          let newIndex = emojiIndex + 1;
          if (newIndex < arrayEmoji.length) { newEmoji = arrayEmoji[newIndex] }
          else if (arrayIndex !== Object.keys(emojiData).length - 1) {
            let arrayBelow = Object.values(emojiData)[arrayIndex + 1]
            newEmoji = arrayBelow[0]
          }
        }
        break; 
    }

    newEmoji && setFocusedEmoji(newEmoji);
  }

  const refVirtualList = React.useRef<VirtualList>(null);

  const ScrollProps = {
    emojisPerRow: emojisPerRow!,
    focusedEmoji,
    refVirtualList,
    handleClickInScroll,
    handleMouseInScroll,
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

  const themeClass = React.useMemo((): string => {
    let darkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return darkMode ? "emoji-picker emoji-picker-dark" : "emoji-picker"
  }, [])
  
  const styleWidth = React.useMemo((): string => {
    return `calc(36px * ${emojisPerRow} + 1em + ${measureScrollbar()}px + 1px)`
  }, [])

  return (
    <div className={ themeClass } style={{ width: styleWidth }}>
      { showNavbar && <Navbar data={emojiData} handleClickInNavbar={handleClickInNavbar}/> }
      <div className="emoji-picker-scroll" role="grid" onKeyDown={handleKeyDownScroll}>
        { query !== ""
          ? searchEmojis !== undefined && Object.values(searchEmojis).flat().length !== 0
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
})

EmojiPicker.defaultProps = defaultEmojiPickerProps;
export default EmojiPicker;