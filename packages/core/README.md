# @brianhung/emoji-picker-core

Framework-neutral data, search, and state for emoji pickers, with no dependencies.

## Installation

```bash
npm i @brianhung/emoji-picker-core
```

## Usage

```ts
import { createEmojiPicker, createEmojiStore, createEmojiSuggestions } from "@brianhung/emoji-picker-core";

const store = createEmojiStore();
await store.load();

const picker = createEmojiPicker(store, { frequent: 16 });
picker.subscribe(() => render(picker.getSnapshot().sections));
picker.setQuery("cat");

const typeahead = createEmojiSuggestions(store, { onChoose: (s) => insert(typeahead.textFor(s)) });
input.addEventListener("keydown", (e) => typeahead.keydown(e));
const stop = typeahead.syncCombobox(input);
```

`data` defaults to the English dataset of [`@brianhung/emoji-picker-data`](../data/README.md) on jsDelivr, pinned to this version. Uncontrolled frequently used emoji and skin tone persist to `localStorage`; `store.packErrors()` reports a custom emoji loader that failed.

## Entry points

| Import | Contents |
|---|---|
| `@brianhung/emoji-picker-core` | `createEmojiStore`, `createEmojiPicker`, `createEmojiSuggestions`, `createSearch`, `lexical`, `resolveEmoji`, `findShortcodeTrigger`, `isComposingKey`, `localeData`, `twemojiUrl`, unified-code helpers |
| `/grid` | Grid and strip layout and keyboard navigation, for your own virtualizer |
| `/native` | Whether the system font draws an emoji |
| `/build` | `buildDataset` from `emojibase-data`, also as the `emoji-picker build-data <locale>` CLI |

## Docs

[emoji.brianhung.me](https://emoji.brianhung.me)

## License

MIT. Third-party notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
