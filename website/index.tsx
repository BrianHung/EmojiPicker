import React from 'react';
import ReactDOM from 'react-dom';

import type { EmojiObject } from '../src/index';
import { EmojiPicker, EmojiPickerRef, unifiedToNative } from '../src/index';
import EmojiData from "../data/twemoji.json"
const emojiData = Object.freeze(EmojiData)

// import debounce from 'lodash-es/debounce';
import './index.css';

function ExampleSetup() {

  const ref = React.createRef<EmojiPickerRef>()

  const inputProps = {
    placeholder: "search-or-navigate",
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => ref.current?.search(event.target.value),
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => { ["Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key) && ref.current.handleKeyDownScroll(event); event.target.focus() },
  }
  
  const pickerProps = { 
    emojiData, 
    onEmojiSelect: (emoji: EmojiObject) => { console.log(emoji); copyToClipboard(unifiedToNative(emoji.unicode)); }, 
    ref, 
    showNavbar: true, 
    showFooter: true,
    collapseHeightOnSearch: false,
  }

  return (
    <div style={{'display': 'flex', 'flexDirection': 'column', 'height': '100vh', 'justifyContent': 'center', 'alignItems': 'center'}}>
      <h1>Emoji Picker</h1>
      <p>A virtualized <a href="https://twemoji.twitter.com/">twemoji</a> picker written in React and TypeScript.</p>
      <EmojiPicker {...pickerProps}/>
      <input {...inputProps}/>
      <a href="https://github.com/BrianHung/EmojiPicker">See the code →</a>
    </div>
  )
}

ReactDOM.render(<ExampleSetup/>, document.getElementById('example-setup'));

const copyToClipboard = (string: string) => {
  const textArea = document.createElement('textarea');
  textArea.value = string;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
};