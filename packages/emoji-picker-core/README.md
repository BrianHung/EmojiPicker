# @brianhung/emoji-picker-core

The framework-neutral half of [`@brianhung/emoji-picker`](https://www.npmjs.com/package/@brianhung/emoji-picker), with no dependencies: emoji data, search, frequently used emoji, skin tones, the picker's and the typeahead's state, Slack shortcodes, and a ProseMirror plugin. It owns every public type and extension contract (`EmojiSearch`, `EmojiStorage`, `CustomEmojiSource`, `EmojiTrigger`, the dataset format, selections and records), so search engines, storage adapters and editor bindings can depend on it alone.

```bash
npm install @brianhung/emoji-picker-core
```

| Import | Contents |
|---|---|
| `@brianhung/emoji-picker-core` | `createEmojiStore`, `createPickerState`, `createEmojiSuggestions`, `resolveEmoji`, frequency storage, Twemoji helpers, tokenizers, labels, the grid model, and every public type |
| `@brianhung/emoji-picker-core/search` | Building blocks for `searchEngine`: `lexical`, `fuse`, `remote`, `merge`, `fallback`, `progressive`, `rerank`, `preferFrequent` |
| `@brianhung/emoji-picker-core/prosemirror` | `emojiTypeahead(store, options)`: the `:shortcode` typeahead as a ProseMirror plugin (`prosemirror-state` and `prosemirror-view` are optional peer dependencies) |
| `@brianhung/emoji-picker-core/data/en.json` | The English dataset |

Every store has the same shape: `subscribe(listener)`, `getSnapshot()` for the current immutable state, and actions.

```ts
import { createEmojiStore, createEmojiSuggestions } from "@brianhung/emoji-picker-core";

const store = createEmojiStore({ data: "/emoji/en.json" });
const typeahead = createEmojiSuggestions(store, { onChoose: (s) => insert(typeahead.textFor(s)) });
typeahead.subscribe(render);
typeahead.setQuery("tada");
```

Build a dataset for another locale with the `build-data` command (`npm install --save-dev emojibase-data` first):

```bash
npx @brianhung/emoji-picker-core build-data ja --out public/emoji/ja.json
```

See the [`@brianhung/emoji-picker` README](https://github.com/BrianHung/EmojiPicker/tree/main/packages/emoji-picker#readme) for the full API.
