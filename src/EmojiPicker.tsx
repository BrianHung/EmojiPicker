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
  emojiSize: number;
  onEmojiSelect: (emoji: EmojiObject) => void;
  showNavbar?: boolean;
  showFooter?: boolean;
  showScroll?: boolean;
  emojisPerRow?: number;
  onKeyDownScroll?: Function;
  collapseCategoriesOnSearch?: boolean;
  collapseHeightOnSearch?: boolean;
}

// Define public methods accessible via ref.

export interface EmojiPickerRef {
  search: (query: string) => void;
  emojis: Record<string, EmojiObject[]>;
  focusedEmoji: EmojiObject | null;
  handleKeyDownScroll: (event: React.KeyboardEvent<HTMLElement>) => void;
}

function EmojiPickerRefComponent({emojiData = {}, emojiSize = 36, onEmojiSelect = (emoji: EmojiObject) => console.log(emoji), showNavbar = false, showFooter = false, showScroll = true, emojisPerRow = 9, onKeyDownScroll = (event) => null, collapseCategoriesOnSearch = true, collapseHeightOnSearch = true}: EmojiPickerProps, ref: React.Ref<EmojiPickerRef>) {

  // Initialize EmojiPicker state using hooks.

  const [ searchEmojis, setSearchEmojis ] = useState<Record<string, EmojiObject[]> | null>(null);
  const [ focusedEmoji, setFocusedEmoji ] = useState<{emoji: EmojiObject, row: number} | null>({row: 1, emoji: Object.values(emojiData).flat()[0]});

  const { itemCount, itemRanges } = useMemo(() => calcCountAndRange(searchEmojis || emojiData, emojisPerRow), [searchEmojis, emojisPerRow]);

  useEffect(function() { 
    const [emoji] = Object.values(searchEmojis || emojiData).flat()
    setFocusedEmoji(emoji ? {row: 1, emoji} : null) 
  }, [searchEmojis])

  /**
   * TODO: Replace in-memory fuse.js with indexeddb and search index.
   * See as an example: https://github.com/nolanlawson/emoji-picker-element
   */

  const [ emojiIndex ] = useState(
    new Fuse.default(Object.values(emojiData).flat(), { 
      threshold: 0.10, 
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

  // Define event handlers in scroll element.

  const handleClickInScroll = (emoji: EmojiObject, row: number) => (event: React.MouseEvent<HTMLElement>) => {
    onEmojiSelect(emoji);
    emoji != focusedEmoji?.emoji && setFocusedEmoji({row, emoji})
    const emojiSpan = event.target as HTMLElement; emojiSpan.focus();
  }
  
  const handleMouseInScroll = (emoji: EmojiObject, row: number) => (event: React.MouseEvent<HTMLElement>) => {
    if (event.movementX === 0 && event.movementY === 0) return;
    emoji != focusedEmoji?.emoji && setFocusedEmoji({row, emoji})
    const emojiSpan = event.target as HTMLElement; emojiSpan.focus();
  }

  const handleKeyDownScroll = (event: React.KeyboardEvent<HTMLElement>) => {
    const emojis = Object.values(searchEmojis || emojiData).filter(array => array.length !== 0);
    switch (event.key) {
      case "Enter": {
        event.preventDefault();
        if (!focusedEmoji) {
          let emoji = Object.values(searchEmojis || emojiData).flat()[0]
          emoji && setFocusedEmoji({row: 1, emoji})
        } else {
          focusedEmoji && onEmojiSelect(focusedEmoji.emoji);
        }
        return;
      }
      case "ArrowUp": {
        event.preventDefault();
        let emoji: EmojiObject, row: number;
        if (!focusedEmoji) {
          emoji = Object.values(searchEmojis || emojiData).flat()[0];
          row = 1;
        } else {
          let arrayIndex, arrayEmoji, emojiIndex;
          emojis.find((array, index) => { 
            emojiIndex = array.findIndex(emoji => emoji === focusedEmoji.emoji), arrayIndex = index, arrayEmoji = array; 
            return emojiIndex !== -1;
          })
          if (emojiIndex != undefined) {
            if (emojiIndex - emojisPerRow >= 0) { // not first row
              emoji = arrayEmoji[emojiIndex - emojisPerRow]; 
              row = focusedEmoji.row - 1;
            } else if (arrayIndex !== 0) {
              const arrayAbove = emojis[arrayIndex - 1];
              const index = (emojiIndex > (arrayAbove.length - 1) % emojisPerRow) ? arrayAbove.length - 1 : Math.floor((arrayAbove.length - 1 - emojiIndex) / emojisPerRow) * emojisPerRow + emojiIndex;
              emoji = arrayAbove[index]; // go directly up if possible; else last element
              row = focusedEmoji.row - 2; // skip category title row
            }
          }
        }
        // @ts-ignore
        emoji && setFocusedEmoji({row, emoji})
        return;
      }
      case "ArrowDown": {
        event.preventDefault();
        let emoji: EmojiObject, row: number;
        if (!focusedEmoji) {
          emoji = Object.values(searchEmojis || emojiData).flat()[0]
          row = 1;
        } else {
          let arrayIndex, arrayEmoji, emojiIndex;
          emojis.find((array, index) => { 
            emojiIndex = array.findIndex(emoji => emoji === focusedEmoji.emoji), arrayIndex = index, arrayEmoji = array; 
            return emojiIndex !== -1;
          })
          if (emojiIndex != undefined) {
            if (emojiIndex + emojisPerRow < arrayEmoji.length) { // not last row
              emoji = arrayEmoji[emojiIndex + emojisPerRow]; 
              row = focusedEmoji.row + 1;            
            } else if (emojiIndex + emojisPerRow < Math.ceil(arrayEmoji.length / emojisPerRow) * emojisPerRow) {
              emoji = arrayEmoji[arrayEmoji.length - 1];
              row = focusedEmoji.row + 1;
            } else if (arrayIndex !== emojis.length - 1) {
              const arrayBelow = emojis[arrayIndex + 1], modIndex = emojiIndex % emojisPerRow;
              emoji = arrayBelow[modIndex] || arrayBelow[arrayBelow.length - 1] // go directly down if possible
              row = focusedEmoji.row + 2; // skip category title row
            }
          }
        }
        // @ts-ignore
        emoji && setFocusedEmoji({row, emoji})
        return;  
      }
      case "ArrowLeft": {
        event.preventDefault();
        let emoji: EmojiObject, row: number;
        if (!focusedEmoji) {
          emoji = Object.values(searchEmojis || emojiData).flat()[0]
          row = 1;
        } else {
          let arrayIndex, arrayEmoji, emojiIndex;
          emojis.find((array, index) => { 
            emojiIndex = array.findIndex(emoji => emoji === focusedEmoji.emoji), arrayIndex = index, arrayEmoji = array; 
            return emojiIndex !== -1;
          })
          if (emojiIndex != undefined) {
            if (emojiIndex - 1 >= 0) { 
              emoji = arrayEmoji[emojiIndex - 1];
              row = Math.floor(emojiIndex/emojisPerRow) == Math.floor((emojiIndex - 1)/emojisPerRow) ? focusedEmoji.row : focusedEmoji.row - 1;
            } else if (arrayIndex !== 0) { // category above this one if it exists
              const arrayAbove = emojis[arrayIndex - 1];
              emoji = arrayAbove[arrayAbove.length - 1];
              row = focusedEmoji.row - 2; // skip category title row
            }
          }
        }
        // @ts-ignore
        emoji && setFocusedEmoji({row, emoji})
        return;    
      }
      case "ArrowRight": {
        event.preventDefault();
        let emoji: EmojiObject, row: number;
        if (!focusedEmoji) {
          emoji = Object.values(searchEmojis || emojiData).flat()[0]
          row = 1;
        } else {
          let arrayIndex, arrayEmoji, emojiIndex;
          emojis.find((array, index) => { 
            emojiIndex = array.findIndex(emoji => emoji === focusedEmoji.emoji), arrayIndex = index, arrayEmoji = array; 
            return emojiIndex !== -1;
          })
          if (emojiIndex != undefined) {
            let newIndex = emojiIndex + 1;
            if (newIndex < arrayEmoji.length) { 
              emoji = arrayEmoji[newIndex] 
              row = Math.floor(emojiIndex/emojisPerRow) == Math.floor(newIndex/emojisPerRow) ? focusedEmoji.row : focusedEmoji.row + 1;
            } else if (arrayIndex !== emojis.length - 1) {
              let arrayBelow = emojis[arrayIndex + 1];
              emoji = arrayBelow[0];
              row = focusedEmoji.row + 2; // skip category title row
            }
          }
        }
        // @ts-ignore
        emoji && setFocusedEmoji({row, emoji});
        return; 
      }
      default:
        onKeyDownScroll(event);
    }
  }

  // Make internal state and methods as publicly accessible via ref.

  useImperativeHandle(ref, () => ({search, handleKeyDownScroll, emojis: searchEmojis || emojiData, focusedEmoji: focusedEmoji?.emoji}) as EmojiPickerRef)

  const refVirtualList = useRef<VirtualList>(null);

  const ScrollProps = {
    emojisPerRow: emojisPerRow!,
    emojiSize,
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
    if (virtualList) {
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
    return `calc(${emojiSize}px * ${emojisPerRow} + 1em + ${measureScrollbar() + 1}px)`
  }, [])

  return (
    <div className={ themeClass } style={{ width: styleWidth }}>
      { showNavbar && <Navbar data={emojiData} handleClickInNavbar={handleClickInNavbar}/> }
      <div className="emoji-picker-scroll" role="grid" aria-rowcount={itemCount} aria-colcount={emojisPerRow} tabIndex={0} onKeyDown={handleKeyDownScroll}>
        { searchEmojis
          ? Object.values(searchEmojis).flat().length !== 0
            ? <Scroll {...ScrollProps} emojiData={searchEmojis}/>
            : <div className="emoji-picker-category" style={{height: collapseHeightOnSearch ? 'inherit' : '432px'}}>
                <div className="emoji-picker-category-title">No results</div>
              </div>
          : showScroll && 
              <Scroll {...ScrollProps} emojiData={emojiData}/>
        }
      </div>
      { showFooter && <Footer emoji={focusedEmoji?.emoji}/> }
    </div>
  )
}

export const EmojiPicker = forwardRef(EmojiPickerRefComponent);