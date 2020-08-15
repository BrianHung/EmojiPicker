import React from "react";
import Emoji from "../Emoji"
import { EmojiObject } from "../utils"

const Navbar: React.FunctionComponent<{data: Record<string, EmojiObject[]>, handleClickInNavbar: Function, [key: string]: any}> = ({data, handleClickInNavbar, ...props}) => {
  return (
    <div className="emoji-picker-navbar" {...props}>
      { Object.entries(data).map(([category, list]) => 
        <span className="emoji-picker-navbar-category" key={`navbar-${category}`} data-category={category} onClick={handleClickInNavbar(category)}>
          { <Emoji emoji={list[0]}/> }
        </span>
      )}
    </div>  
  )
}

const MemoizedNavbar = React.memo(Navbar)
export default MemoizedNavbar;