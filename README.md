React Twemoji Picker is an emoji component made for fast show-and-scroll and filtering. 

To do this, we virtualize emoji elements with [`react-window`](https://github.com/bvaughn/react-window) 
and `react-window-infinite-loader`, meaning elements are not rendered into the DOM until they 
are visible through the scroll viewport. This allows `react-twemoji-picker` to be used with input or 
contenteditable components which require fast responsivity.

## Installation

```bash
npm install --save github:brianhung/emojipicker
```

## Usage

```js
import { EmojiPicker } from 'react-twemoji-picker';
import EmojiData from "react-twemoji-picker/data/twemoji.json";

const emojiData = Object.freeze(EmojiData)
const handleEmojiSelect = (emoji: EmojiObject) => console.log(emoji)

<EmojiPicker emojiData={emojiData} handleEmojiSelect={handleEmojiSelect}/>
```

If you want to programatically get or set internal state (e.g. `search`), you have to use `EmojiPickertRef` 
since `EmojiPicker` is a functional component. As an example,

```jsx
import { EmojiPicker, EmojiPickerRef } from 'react-twemoji-picker';
const ref = React.createRef<EmojiPickerRef>()
const handleSearch = (query: string) => ref.current.search(query);
<EmojiPicker emojiData={emojiData} handleEmojiSelect={handleEmojiSelect} ref={ref}/>
<input onChange={event => handleSearch(event.target.value)} placeholder="search"></input>
```
