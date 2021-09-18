import React, { FC } from 'react';
import { EmojiObject, unifiedToNative } from './utils'
import twemoji from "./twemoji.svg"

type EmojiProps = { 
  emoji: EmojiObject; 
  className?: string;
  [key: string]: any; 
}

const Emoji: FC<EmojiProps> = ({emoji, className, ...props}) => {
  className = className ? `emoji-picker-emoji ${className}` : `emoji-picker-emoji`
  return (
    <img 
      className={className} 
      data-unicode={emoji.unicode}
      alt={unifiedToNative(emoji.unicode)} 
      src={`${twemoji}#${emoji.unicode}`} 
      draggable="false"
      aria-label={emoji.name} 
      {...props}
    />
  )
}

export { EmojiProps, Emoji };
export default Emoji;
