<div align="center" style="margin: 0.5rem 0">
  <br><b>React Twemoji Picker</b> is an emoji component
  <br>made for fast show-and-scroll and filtering
  <br><a href="https://brianhung.github.io/EmojiPicker">demo</a>
  <br><a href="https://brianhung.github.io/EmojiPicker"><img width="343px" src="./demo.png" alt="image of emoji picker" title="click to navigate to demo" style="margin-top: 0.5rem"></a>
</div>

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

To see an example, look at the <a href="./website/index.tsx">source code</a> for the demo.

### Props

```ts
emojiData: Record<string, EmojiObject[]>; // map of categories to list of emoji objects
emojiSize?: number; // pixel size of an emoji
onEmojiSelect?: (emoji: EmojiObject) => void, // handle emoji click or enter key here
showNavbar?: boolean; // allows navigation to categories
showFooter?: boolean; // show focused emoji and its name
showScroll?: boolean; // turn off if query is always not null
emojisPerRow?: number; // number of emojis to show per row
onKeyDownScroll?: Function; // handle additional key events like 'ctrl-c' here
collapseCategoriesOnSearch?: boolean; // merge categories into single 'search results' category
collapseHeightOnSearch?: boolean; // scroll height changes with number of emojis
```