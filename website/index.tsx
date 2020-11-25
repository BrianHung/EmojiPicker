import React, { useRef, useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import type { EmojiObject } from '../src/index';
import { EmojiPicker, EmojiPickerRef, unifiedToNative, throttleIdleTask } from '../src/index';
import EmojiData from "../data/twemoji.json"
const emojiData = Object.freeze(EmojiData)
import './index.css';

const copyToClipboard = (string: string) => {
  const textArea = document.createElement('textarea');
  textArea.value = string;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
};

function ExampleSetup() {

  const picker = useRef<EmojiPickerRef>()
  const input = useRef<HTMLInputElement>()

  // need reference to same function to throttle
  const throttledQuery = useCallback(throttleIdleTask((query: string) => picker.current?.search(query)), [picker.current]);

  const inputProps = {
    ref: input,
    placeholder: "search-or-navigate",
    onChange: (event: React.ChangeEvent<HTMLElement>) => throttledQuery((event.target as HTMLInputElement).value),
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => { 
      if (!["Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      picker.current.handleKeyDownScroll(event); 
      (event.target as HTMLInputElement).focus(); 
      if (event.key == "Enter") {
        picker.current.search("");
        input.current.value = "";
      }
    },
  }

  const onEmojiSelect = (emoji: EmojiObject) => {
    const nativeEmoji = unifiedToNative(emoji.unicode);
    copyToClipboard(nativeEmoji);
    notification.show(`Copied ${nativeEmoji} to clipboard`);
    console.log(emoji);
  }
  
  const emojiPickerProps = { 
    ref: picker, 
    emojiData, 
    onEmojiSelect, 
    showNavbar: true, 
    showFooter: true,
    collapseHeightOnSearch: false,
  }

  /**
   * Adaptation of show-and-hide popup from https://rsms.me/inter/#charset for React hooks.
   * Ignore this if you're just using this website as an example of how to setup the emoji picker.
   */
  const [notification] = useState(() => {

    let timer = null
    let visible =  false

    const show = (message) => {
      const el = document.querySelector('#notification') as HTMLDivElement;
      el.firstChild.innerText = message
      el.classList.add('visible')
      if (visible) {
        hide()
        setTimeout(() => show(message), 120)
        return
      }
      visible = true
      el.style.visibility = null
      clearTimeout(timer)
      timer = setTimeout(() => hide(), 1200)
    }

    const hide = () => {
      const el = document.querySelector('#notification') as HTMLDivElement;
      if (visible) {
        el.classList.remove('visible')
        visible = false
        el.style.visibility = 'hidden'
      }
    }
  
    return { show }
  })

  return (
    <div style={{'display': 'flex', 'flexDirection': 'column', 'height': '100vh', 'justifyContent': 'center', 'alignItems': 'center'}}>
      <h1>Emoji Picker</h1>
      <p>A virtualized <a href="https://twemoji.twitter.com/">twemoji</a> picker written in React and TypeScript.</p>
      <EmojiPicker {...emojiPickerProps}/>
      <input {...inputProps}/>
      <a href="https://github.com/BrianHung/EmojiPicker">source code →</a>
      <div id="notification">
        <div></div>
      </div>
    </div>
  )
}

ReactDOM.render(<ExampleSetup/>, document.getElementById('example-setup'));