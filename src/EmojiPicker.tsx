import React, { forwardRef, useState, useImperativeHandle, useMemo, useEffect, useRef } from "react"
import { FixedSizeList as VirtualList } from 'react-window';

import { EmojiObject, measureScrollbar, calcCountAndRange, itemRange } from './utils'
import "./EmojiPicker.css"

import Navbar from "./EmojiPicker/Navbar";
import Footer from "./EmojiPicker/Footer";
import Scroll from "./EmojiPicker/Scroll";

type EmojiPickerProps = {
  emojiData: Record<string, EmojiObject[]>;
  emojiSize?: number;
  onEmojiSelect?: (emoji: EmojiObject) => void;
  showNavbar?: boolean;
  showFooter?: boolean;
  showScroll?: boolean;
  emojisPerRow?: number;
  numberScrollRows?: number;
  onKeyDownScroll?: Function;
  collapseCategoriesOnSearch?: boolean;
  collapseHeightOnSearch?: boolean;
  theme?: "system" | "light" | "dark";
}

// Define public methods accessible via ref.

export interface EmojiPickerRef {
  search: (query: string) => void;
  emojis: Record<string, EmojiObject[]>;
  focusedEmoji: EmojiObject | null;
  handleKeyDownScroll: (event: React.KeyboardEvent<HTMLElement>) => void;
}

function EmojiPickerRefComponent({emojiData = {}, emojiSize = 36, numberScrollRows = 12, onEmojiSelect = (emoji: EmojiObject) => console.log(emoji), showNavbar = false, showFooter = false, showScroll = true, emojisPerRow = 9, onKeyDownScroll = (event) => null, collapseCategoriesOnSearch = true, collapseHeightOnSearch = true, theme = "system"}: EmojiPickerProps, ref: React.Ref<EmojiPickerRef>) {

  // Initialize EmojiPicker state using hooks.

  const [ searchEmojis, setSearchEmojis ] = useState<{emojis: Record<string, EmojiObject[]> | null, query: string}>({emojis: null, query: ""});
  const [ focusedEmoji, setFocusedEmoji ] = useState<{emoji: EmojiObject, row: number, focusOnRender: boolean, preventScroll: boolean} | null>({row: 1, emoji: Object.values(emojiData).flat()[0], focusOnRender: false, preventScroll: false});

  const { itemCount, itemRanges } = useMemo(() => calcCountAndRange(searchEmojis.emojis || emojiData, emojisPerRow), [searchEmojis, emojisPerRow]);

  useEffect(function() { 
    const [emoji] = Object.values(searchEmojis.emojis || emojiData).flat()
    setFocusedEmoji(emoji ? {row: 1, emoji, focusOnRender: Boolean(document.activeElement?.closest(".emoji-picker-scroll")), preventScroll: false} : null) 
  }, [searchEmojis])

  /**
   * TODO: Replace in-memory search with indexeddb index.
   * See as an example: https://github.com/nolanlawson/emoji-picker-element
   */
  const search = (query: string): void => {
    // reset searchEmojis when query is empty string
    if (!query) { setSearchEmojis({emojis: null, query: ""}); return; } 

    // assumption: increasing query length if prevSearchEmojis is empty will not change searchEmojis
    if (searchEmojis.emojis != null && !Object.values(searchEmojis.emojis).flat().length && searchEmojis.query.length < query.length) return;

    // use prevSearchEmojis if query length has increased, else use full set
    const index = Object.values(searchEmojis.query.length < query.length && searchEmojis.emojis != null ? searchEmojis.emojis : emojiData).flat();

    // simple weighted search to filter emojiObjects
    let results = index
      .map(emoji => ({emoji, score: (emoji.keywords || []).map(word => word.indexOf(query) != -1).reduce((a, b) => a + Number(b), Number(emoji.name.indexOf(query) != -1) * 3)}))
      .filter(a => a.score != 0)
      .sort((a, b) => b.score - a.score)
      .map(({emoji}) => emoji);

    if (collapseCategoriesOnSearch) {
      setSearchEmojis({emojis: {"Search Results": results}, query});
    } else {
      const grouped = Object.entries(emojiData).map(([category, list]) => ([category, list.filter(emoji => results.includes(emoji))])).reduce((sum, [category, list]) => Object.assign(sum, {[category as string]: list}), {});
      setSearchEmojis({emojis: grouped, query});
    }
  }

  // Define event handlers in scroll element.

  const handleClickInScroll = (emoji: EmojiObject, row: number) => (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault(); // MDN docs: keep the focus from leaving the HTMLElement
    onEmojiSelect(emoji);
    emoji != focusedEmoji?.emoji && setFocusedEmoji({row, emoji, focusOnRender: true, preventScroll: true})
  }
  
  const handleMouseInScroll = (emoji: EmojiObject, row: number) => (event: React.MouseEvent<HTMLElement>) => {
    if (emoji == focusedEmoji?.emoji || event.movementX == 0 && event.movementY == 0) return;
    // @ts-ignore
    const isSafari = window.safari !== undefined; // safari does not support preventScroll focus
    setFocusedEmoji({row, emoji, focusOnRender: !isSafari, preventScroll: true})
    isSafari && refScroll.current && refScroll.current.focus();
  }

  const handleKeyDownScroll = (event: React.KeyboardEvent<HTMLElement>) => {
    const emojis = Object.values(searchEmojis.emojis || emojiData).filter(array => array.length !== 0);
    switch (event.key) {
      case "Enter": {
        event.preventDefault();
        if (!focusedEmoji) {
          let emoji = Object.values(searchEmojis.emojis || emojiData).flat()[0]
          emoji && setFocusedEmoji({row: 1, emoji, focusOnRender: Boolean(document.activeElement?.closest(".emoji-picker-scroll")), preventScroll: false})
        } else {
          focusedEmoji && onEmojiSelect(focusedEmoji.emoji);
        }
        return;
      }
      case "ArrowUp": {
        event.preventDefault();
        let emoji: EmojiObject | undefined = undefined, row: number | undefined = undefined;
        if (!focusedEmoji) {
          emoji = Object.values(searchEmojis.emojis || emojiData).flat()[0];
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
        row && emoji && setFocusedEmoji({row, emoji, focusOnRender: Boolean(document.activeElement?.closest(".emoji-picker-scroll")), preventScroll: false})
        row && refVirtualList.current?.scrollToItem(row)
        return;
      }
      case "ArrowDown": {
        event.preventDefault();
        let emoji: EmojiObject | undefined = undefined, row: number | undefined = undefined;
        if (!focusedEmoji) {
          emoji = Object.values(searchEmojis.emojis || emojiData).flat()[0]
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
        row && emoji && setFocusedEmoji({row, emoji, focusOnRender: Boolean(document.activeElement?.closest(".emoji-picker-scroll")), preventScroll: false})
        row && refVirtualList.current?.scrollToItem(row)
        return;  
      }
      case "ArrowLeft": {
        event.preventDefault();
        let emoji: EmojiObject | undefined = undefined, row: number | undefined = undefined;
        if (!focusedEmoji) {
          emoji = Object.values(searchEmojis.emojis || emojiData).flat()[0]
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
        row && emoji && setFocusedEmoji({row, emoji, focusOnRender: Boolean(document.activeElement?.closest(".emoji-picker-scroll")), preventScroll: false})
        row && refVirtualList.current?.scrollToItem(row)
        return;    
      }
      case "ArrowRight": {
        event.preventDefault();
        let emoji: EmojiObject | undefined = undefined, row: number | undefined = undefined;
        if (!focusedEmoji) {
          emoji = Object.values(searchEmojis.emojis || emojiData).flat()[0]
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
        row && emoji && setFocusedEmoji({row, emoji, focusOnRender: Boolean(document.activeElement?.closest(".emoji-picker-scroll")), preventScroll: false})
        row && refVirtualList.current?.scrollToItem(row)
        return; 
      }
      default:
        onKeyDownScroll(event);
    }
  }

  // Make internal state and methods as publicly accessible via ref.

  useImperativeHandle(ref, () => ({search, handleKeyDownScroll, emojis: searchEmojis.emojis || emojiData, focusedEmoji: focusedEmoji?.emoji}) as EmojiPickerRef)

  const refVirtualList = useRef<VirtualList>(null);
  const refScroll = useRef<HTMLDivElement>(null);

  const ScrollProps = {
    emojisPerRow: emojisPerRow!,
    emojiSize,
    numberScrollRows,
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

  
  // Compute width on window resize.
  const [width, setWidth] = useState(`calc(${emojiSize}px * ${emojisPerRow} + 1em + ${measureScrollbar()}px)`);
  useEffect(() => {
    const resizeWidth = () => setWidth(`calc(${emojiSize}px * ${emojisPerRow} + 1em + ${measureScrollbar()}px)`);
    window.addEventListener("resize", resizeWidth);
    return () => window.removeEventListener("resize", resizeWidth);
  }, [])

  return (
    <div className={ `emoji-picker emoji-picker-${theme}` } style={{ width }}>
      { showNavbar && <Navbar data={emojiData} handleClickInNavbar={handleClickInNavbar}/> }
      <div className="emoji-picker-scroll" role="grid" aria-rowcount={itemCount} aria-colcount={emojisPerRow} onKeyDown={handleKeyDownScroll} tabIndex={-1} ref={refScroll}>
        { searchEmojis.emojis
          ? Object.values(searchEmojis.emojis).flat().length !== 0
            ? <Scroll {...ScrollProps} emojiData={searchEmojis.emojis}/>
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