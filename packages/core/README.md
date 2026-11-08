# @emoji-components/core

Framework-neutral data, search, and state for emoji pickers, with no dependencies.

## Installation

```bash
npm i @emoji-components/core
```

## Usage

```ts
import { createEmojiPicker, createEmojiStore, createEmojiSuggestions } from "@emoji-components/core";

const store = createEmojiStore();
await store.load();

const picker = createEmojiPicker(store, { frequent: 16 });
picker.subscribe(() => render(picker.getSnapshot().sections));
picker.setQuery("cat");

const typeahead = createEmojiSuggestions(store, { onChoose: (s) => insert(typeahead.textFor(s)) });
input.addEventListener("keydown", (e) => typeahead.keydown(e));
const stop = typeahead.syncCombobox(input);
```

`data` defaults to the English dataset of [`@emoji-components/data`](../data/README.md) on jsDelivr, pinned to this version. Uncontrolled frequently used emoji and skin tone persist to `localStorage`; `store.packErrors()` reports a custom emoji loader that failed.

## Entry points

| Import | Contents |
|---|---|
| `@emoji-components/core` | `createEmojiStore`, `createEmojiPicker`, `createEmojiSuggestions`, `createSearch`, `lexicalSearch`, `resolveEmoji`, `findShortcodeTrigger`, `isComposingKey`, `localeData`, `twemojiUrl`, unified-code helpers |
| `/grid` | Grid layout and keyboard moves, for your own virtualizer |
| `/native` | Whether the system font draws an emoji |
| `/build` | `buildDataset` from `emojibase-data`, also as the `npx @emoji-components/core build-data <locale>` CLI |

## Docs

[emoji.brianhung.me](https://emoji.brianhung.me)

## License

MIT. Third-party notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
