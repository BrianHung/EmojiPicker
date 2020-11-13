import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import type { EmojiObject } from '../src/index';
import { EmojiPicker, EmojiPickerRef } from '../src/index';
import EmojiData from "../data/twemoji.json"

const emojiData = Object.freeze(EmojiData)
const handleEmojiSelect = (emoji: EmojiObject) => console.log(emoji);

const ref = React.createRef<EmojiPickerRef>()
const handleSearch = (query: string) => ref.current.search(query);
const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
  const handledKeys = ["Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]
  handledKeys.includes(event.key) && ref.current.handleKeyDownScroll(event);
}

const EmojiPickerProps = { emojiData, handleEmojiSelect, ref, showNavbar: true, showFooter: true}

const app = (
  <div style={{'display': 'flex', 'flexDirection': 'column', 'height': '100vh', 'justifyContent': 'center', 'alignItems': 'center'}}>
    <h1>Emoji Picker</h1>
    <p>a virtualized <a href="https://twemoji.twitter.com/">twemoji</a> picker written in react and typescript</p>
    <EmojiPicker {...EmojiPickerProps}/>
    <input onChange={event => handleSearch(event.target.value)} onKeyDown={onKeyDown} placeholder="search"></input>
    <a href="https://github.com/BrianHung/EmojiPicker">source code</a>
  </div>
)

ReactDOM.render(app, document.getElementById('root'));