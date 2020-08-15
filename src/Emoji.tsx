import React from 'react';
import { EmojiObject } from './utils'
import twemoji from "./twemoji.svg"
import "./Emoji.css"

type EmojiProps = { emoji: EmojiObject; [key: string]: any; }

const Emoji = React.forwardRef<HTMLSpanElement, EmojiProps>(function EmojiComponent({emoji, ...props}, ref) {
  return (
    <span className="emoji-picker-emoji" data-unicode={emoji.unicode} {...props} ref={ref}>
      <svg className="emoji-picker-emoji-svg">
        <use href={`${twemoji}#${emoji.unicode}`}></use>
      </svg>
    </span>
  )
})

export default Emoji;
export { EmojiProps };