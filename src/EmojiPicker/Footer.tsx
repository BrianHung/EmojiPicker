import React, { FunctionComponent, memo } from "react";
import Emoji from "../Emoji"
import { EmojiObject } from "../utils"

const Footer: FunctionComponent<{emoji: EmojiObject | undefined, emojiPreviewName, [key: string]: any}> = ({emoji, emojiPreviewName, ...props}) => {
  return (
    <div className="emoji-picker-footer" {...props}>
      { <Emoji emoji={emoji ? emoji : {name: "wave", unicode: "1f44b"}}/> }
      <div className="emoji-picker-name">
        { emoji ? emojiPreviewName(emoji) : <span style={{'fontSize': '1.2em', 'fontWeight': 500}}>Emoji Mart</span> }
      </div>
    </div>     
  )
}

const MemoizedFooter = memo(Footer)
export default MemoizedFooter;