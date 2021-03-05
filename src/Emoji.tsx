import React, { forwardRef } from 'react';
import { EmojiObject, unifiedToNative } from './utils'
import twemoji from "./twemoji.svg"
import "./Emoji.css"

type EmojiProps = { emoji: EmojiObject; [key: string]: any; }
export { EmojiProps };

const Emoji = forwardRef<HTMLSpanElement, EmojiProps>(function EmojiComponent({emoji, className, ...props}, ref) {
  className = className ? `emoji-picker-emoji ${className}` : `emoji-picker-emoji`
  return (
    <span className={className} data-unicode={emoji.unicode} {...props} ref={ref}>
      <img className="emoji-picker-emoji-img" aria-label={emoji.name} alt={unifiedToNative(emoji.unicode)} src={`${twemoji}#${emoji.unicode}`} draggable="false"/>
    </span>
  )
})

export default Emoji;
