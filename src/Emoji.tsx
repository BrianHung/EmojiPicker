import React, { FunctionComponent } from 'react';
import { EmojiObject, unifiedToNative } from './utils'
import twemoji from "./twemoji.svg"

type EmojiProps = { 
  emoji: EmojiObject; 
  className?: string;
  [key: string]: any; 
}

const Emoji: FunctionComponent<EmojiProps> = ({emoji, className, ...props}) => {
  className = className ? `emoji-picker-emoji ${className}` : `emoji-picker-emoji`
  return (
    <span className={className} data-unicode={emoji.unicode} {...props}>
      <img 
        className="emoji-picker-emoji-img" 
        alt={unifiedToNative(emoji.unicode)} 
        src={`${twemoji}#${emoji.unicode}`} 
        draggable="false"
        aria-label={emoji.name} 
      />
    </span>
  )
}

export { EmojiProps, Emoji };
export default Emoji;
