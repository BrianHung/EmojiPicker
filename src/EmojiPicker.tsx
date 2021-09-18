import React, { forwardRef, useCallback, useState, useImperativeHandle, useMemo, useLayoutEffect, useRef, Ref, useReducer, KeyboardEvent, MouseEvent, useEffect } from "react"
import { FixedSizeList as VirtualList } from 'react-window';
import { EmojiObject, measureScrollbar, calcCountAndRange, itemRange } from './utils'

import Navbar from "./EmojiPicker/Navbar";
import Footer from "./EmojiPicker/Footer";
import Scroll from "./EmojiPicker/Scroll";

type EmojiPickerProps = {
  emojiData: Record<string, EmojiObject[]>;
  emojiSize?: number;
  onEmojiSelect?: (emoji: EmojiObject, event: KeyboardEvent | MouseEvent) => void;
  showNavbar?: boolean;
  showFooter?: boolean;
  showScroll?: boolean;
  emojisPerRow?: number;
  numberScrollRows?: number;
  onKeyDownScroll?: Function;
  collapseCategoriesOnSearch?: boolean;
  collapseHeightOnSearch?: boolean;
  theme?: "system" | "light" | "dark";
  emojiPreviewName?: (emoji: EmojiObject) => string;
}

// Define public methods accessible via ref.

export interface EmojiPickerRef {
  search: (query: string) => void;
  emojis: Record<string, EmojiObject[]>;
  focusedEmoji: EmojiObject | null;
  handleKeyDownScroll: (event: KeyboardEvent<HTMLElement>) => void;
}

type PickerState = {
  searchEmojis: {emojis: Record<string, EmojiObject[]> | null, query: string},
  focusedEmoji: {emoji: EmojiObject, row: number, focusOnRender: boolean, preventScroll: boolean} | null
}


// Use state reducer to avoid separate re-renders to changes to searchEmojis and focusedEmoji.
function EmojiPickerReducer({emojiData}) {
  return (prevState: PickerState, nextState: any): PickerState => {
    // reset focusedEmoji to first emoji on searchEmojis change
    if (nextState.searchEmojis && prevState.searchEmojis != nextState.searchEmojis) {
      let emojis = (nextState.searchEmojis?.query && nextState.searchEmojis?.emojis) || emojiData, 
        category = emojis[Object.keys(emojis)[0]];
      let emoji = category[0];
      nextState.focusedEmoji = {row: 1, emoji, focusOnRender: Boolean(document.activeElement?.closest(".emoji-picker-scroll")), preventScroll: false}
    }
    return {...prevState, ...nextState};
  }
}

function EmojiPickerRefComponent({emojiData = {}, emojiSize = 36, numberScrollRows = 12, onEmojiSelect = (emoji: EmojiObject) => console.log(emoji), showNavbar = false, showFooter = false, showScroll = true, emojisPerRow = 9, onKeyDownScroll = (event) => null, collapseCategoriesOnSearch = true, collapseHeightOnSearch = true, theme = "system", emojiPreviewName = (emoji: EmojiObject) => emoji.name}: EmojiPickerProps, ref: Ref<EmojiPickerRef>) {

  const pickerStateReducer = useCallback(EmojiPickerReducer({emojiData}), [emojiData])
  const [ pickerState, setPickerState ] = useReducer(pickerStateReducer, {
    searchEmojis: {emojis: null, query: ""},
    focusedEmoji: {row: 1, emoji: Object.values(emojiData).flat()[0], focusOnRender: Boolean(document.activeElement?.closest(".emoji-picker-scroll")), preventScroll: false}
  })

  const { itemCount, itemRanges } = useMemo(() => calcCountAndRange(pickerState.searchEmojis.emojis || emojiData, emojisPerRow), [pickerState.searchEmojis, emojisPerRow]);

  /**
   * TODO: Replace in-memory search with indexeddb index.
   * See as an example: https://github.com/nolanlawson/emoji-picker-element
   */
  const search = (query: string): void => {
    const {searchEmojis} = pickerState;

    // reset pickerState when query is empty string
    if (!query)
      return setPickerState({
        searchEmojis: {emojis: null, query: ""},
        focusedEmoji: {row: 1, emoji: Object.values(emojiData).flat()[0], focusOnRender: Boolean(document.activeElement?.closest(".emoji-picker-scroll")), preventScroll: false}
      });

    // assumption: increasing query length if prevSearchEmojis is empty will not change searchEmojis
    if (searchEmojis?.emojis && !Object.values(searchEmojis.emojis).flat().length && searchEmojis.query.length < query.length)
      return setPickerState({searchEmojis: {emojis: searchEmojis.emojis, query}});

    // use prevSearchEmojis if query length has increased, else use full set
    const index = query.length > searchEmojis.query.length && searchEmojis.emojis != null
      ? Object.values(searchEmojis.emojis).flat()
      : Object.values(emojiData).flat();

    // simple weighted search to filter emojiObjects
    let results = index
      .map(emoji => ({emoji, score: (emoji.keywords || []).map(word => word.indexOf(query) != -1).reduce((a, b) => a + Number(b), Number(emoji.name.indexOf(query) != -1) * 3)}))
      .filter(a => a.score)
      .sort((a, b) => b.score - a.score)
      .map(({emoji}) => emoji);

    if (collapseCategoriesOnSearch) {
      return setPickerState({searchEmojis: {emojis: {"Search Results": results}, query}});
    } else {
      let grouped = Object.entries(emojiData).map(([category, list]) => ([category, list.filter(emoji => results.includes(emoji))])).reduce((sum, [category, list]) => Object.assign(sum, {[category as string]: list}), {});
      return setPickerState({searchEmojis: {emojis: grouped, query}});
    }
  }

  const refVirtualList = useRef<VirtualList>(null);
  const refScroll = useRef<HTMLDivElement>(null);

  // Define event handlers in scroll element.

  const handleClickInScroll = (emoji: EmojiObject, row: number) => (event: MouseEvent<HTMLElement>) => {
    event.preventDefault(); // MDN docs: keep the focus from leaving the HTMLElement
    onEmojiSelect(emoji, event);
    setPickerState({focusedEmoji: {row, emoji, focusOnRender: true, preventScroll: true}})
  }
  
  const handleMouseInScroll = (emoji: EmojiObject, row: number) => (event: MouseEvent<HTMLElement>) => {
    if (emoji == pickerState.focusedEmoji?.emoji || event.movementX == 0 && event.movementY == 0) return;
    event.preventDefault(); // MDN docs: keep the focus from leaving the HTMLElement
    // @ts-ignore
    const isSafari = window.safari !== undefined; // safari does not support preventScroll focus
    setPickerState({focusedEmoji: {row, emoji, focusOnRender: true, preventScroll: true}})
    isSafari && refScroll.current && refScroll.current.focus();
  }

  const handleKeyDownScroll = (event: KeyboardEvent<HTMLElement>) => {
    const {searchEmojis, focusedEmoji} = pickerState;
    const emojis = Object.values(searchEmojis.emojis || emojiData).filter(array => array.length !== 0);
    switch (event.key) {
      case "Enter": {
        event.preventDefault();
        if (!focusedEmoji) {
          let emoji = Object.values(searchEmojis.emojis || emojiData).flat()[0]
          emoji && setPickerState({focusedEmoji: {row: 1, emoji, focusOnRender: Boolean(document.activeElement?.closest(".emoji-picker-scroll")), preventScroll: false}})
        } else {
          focusedEmoji.emoji && onEmojiSelect(focusedEmoji.emoji, event);
        }
        return;
      }
      case 'Home': {
        event.preventDefault();
        let emoji: EmojiObject | undefined = undefined, row: number | undefined = undefined;
        let emojis = searchEmojis.emojis || emojiData, 
          category = emojis[Object.keys(emojis)[0]];
        emoji = category[0]
        row = 1;
        return row && emoji && setPickerState({focusedEmoji: {row, emoji, focusOnRender: Boolean(document.activeElement?.closest(".emoji-picker-scroll")), preventScroll: false}})
      }
      case 'End': {
        event.preventDefault();
        let emoji: EmojiObject | undefined = undefined, row: number | undefined = undefined;
        let emojis = searchEmojis.emojis || emojiData, 
          category = emojis[Object.keys(emojis).pop() as string];
        emoji = category[category.length - 1]
        row = itemRanges[itemRanges.length - 1]?.to - 1;
        return row && emoji && setPickerState({focusedEmoji: {row, emoji, focusOnRender: Boolean(document.activeElement?.closest(".emoji-picker-scroll")), preventScroll: false}});
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
        return row && emoji && setPickerState({focusedEmoji: {row, emoji, focusOnRender: Boolean(document.activeElement?.closest(".emoji-picker-scroll")), preventScroll: false}})
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
        return row && emoji && setPickerState({focusedEmoji: {row, emoji, focusOnRender: Boolean(document.activeElement?.closest(".emoji-picker-scroll")), preventScroll: false}})
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
        return row && emoji && setPickerState({focusedEmoji: {row, emoji, focusOnRender: Boolean(document.activeElement?.closest(".emoji-picker-scroll")), preventScroll: false}})
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
        return row && emoji && setPickerState({focusedEmoji: {row, emoji, focusOnRender: Boolean(document.activeElement?.closest(".emoji-picker-scroll")), preventScroll: false}})
      }
      default:
        return onKeyDownScroll(event);
    }
  }


  // Make internal state and methods as publicly accessible via ref.
  useImperativeHandle(ref, () => ({
    search, 
    handleKeyDownScroll, 
    emojis: pickerState.searchEmojis.emojis || emojiData, 
    focusedEmoji: pickerState.focusedEmoji?.emoji,
  }) as EmojiPickerRef)

  const ScrollProps = {
    emojiData: pickerState.searchEmojis.emojis || emojiData,
    emojisPerRow: emojisPerRow!,
    emojiSize,
    numberScrollRows,
    focusedEmoji: pickerState.focusedEmoji,
    refVirtualList,
    handleClickInScroll,
    handleMouseInScroll,
    collapseHeightOnSearch,
    itemCount, 
    itemRanges,
  }


  // Define event handler for select in navbar element.
  const handleSelectInNavbar = (category: string) => {
    let virtualList = refVirtualList.current;
    if (virtualList) {
      let range: itemRange | undefined = itemRanges.find(range => range.key === category)
      if (range) {
        setPickerState({focusedEmoji: {row: range.from + 1, emoji: emojiData[category][0], focusOnRender: false, preventScroll: false}})
        virtualList.scrollToItem(range.from, "start");
      }
    }
  }

  const getWidths = () => {
    const scrollbarWidth = measureScrollbar()
    return {
      scrollbarWidth,
      width: `calc(${emojiSize}px * ${emojisPerRow} + 1em + ${scrollbarWidth}px)`
    }
  }

  // Compute width on window resize.
  const [width, setWidth] = useState(getWidths);
  useLayoutEffect(() => {
    let resizeWidth = () => setWidth(getWidths);
    window.addEventListener("resize", resizeWidth);
    return () => window.removeEventListener("resize", resizeWidth);
  }, [])

  return (
    <div className={`emoji-picker emoji-picker-${theme}`} style={{width: width.width}}>
      { showNavbar && 
        <Navbar data={emojiData} handleSelectInNavbar={handleSelectInNavbar} style={{marginRight: width.scrollbarWidth}}/> 
      }
      <div className="emoji-picker-scroll" role="grid" aria-rowcount={itemCount} aria-colcount={emojisPerRow} onKeyDown={handleKeyDownScroll} ref={refScroll}>
        { pickerState.searchEmojis.emojis
          ? Object.values(pickerState.searchEmojis.emojis).flat().length
            ? <Scroll {...ScrollProps}/>
            : <div className="emoji-picker-category" style={{height: collapseHeightOnSearch ? 'inherit' : '432px'}}>
                <div className="emoji-picker-category-title">No results</div>
              </div>
          : showScroll && 
              <Scroll {...ScrollProps}/>
        }
      </div>
      { showFooter && 
        <Footer emoji={pickerState.focusedEmoji?.emoji} emojiPreviewName={emojiPreviewName}/> 
      }
    </div>
  )
}

export const EmojiPicker = forwardRef(EmojiPickerRefComponent);