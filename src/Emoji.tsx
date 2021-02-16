import React, { forwardRef } from 'react';
import { EmojiObject } from './utils'
import twemoji from "./twemoji.svg"
import "./Emoji.css"

type EmojiProps = { emoji: EmojiObject; [key: string]: any; }
export { EmojiProps };

const Emoji = forwardRef<HTMLSpanElement, EmojiProps>(function EmojiComponent({emoji, ...props}, ref) {
  return (
    <span className="emoji-picker-emoji" data-unicode={emoji.unicode} {...props} ref={ref}>
      <img className="emoji-picker-emoji-img" src={`${twemoji}#${emoji.unicode}`}/>
    </span>
  )
})

export default Emoji;
