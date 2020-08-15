import React from "react";
import Emoji from "../Emoji"
import { EmojiObject } from "../utils"

const Footer: React.FunctionComponent<{emoji: EmojiObject | null, [key: string]: any}> = ({emoji, ...props}) => {
  return (
    <div className="emoji-picker-footer" {...props}>
      { <Emoji emoji={emoji !== null ? emoji : {name: "wave", unicode: "1f44b"}}/> }
      <div className="emoji-picker-name">
        { emoji !== null ? emoji.name : <span style={{'fontSize': '1.2em', 'fontWeight': 500}}>Emoji Mart</span> }
      </div>
    </div>     
  )
}

const MemoizedFooter = React.memo(Footer)
export default MemoizedFooter;