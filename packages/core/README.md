# @brianhung/emoji-picker-core

Framework-neutral data, search, and state for [`@brianhung/emoji-picker-react`](https://www.npmjs.com/package/@brianhung/emoji-picker-react), with no dependencies.

## Installation

```bash
npm install @brianhung/emoji-picker-core
```

## Usage

Every store has `subscribe(listener)`, `getSnapshot()`, and actions.

```ts
import { createEmojiStore, createEmojiSuggestions, createPickerState, moveHighlight } from "@brianhung/emoji-picker-core";

const store = createEmojiStore({ data: "/emoji/en.json" });

const typeahead = createEmojiSuggestions(store, { onChoose: (s) => insert(typeahead.textFor(s)) });
typeahead.subscribe(render);
typeahead.setQuery("tada");
input.addEventListener("keydown", (e) => typeahead.keydown(e));

const picker = createPickerState(store, { searchResults: "ranked" });
picker.setQuery("heart");
moveHighlight(picker, "right", { columns: 9 });
picker.choose();
```

## Entry points

| Import | Contents |
|---|---|
| `@brianhung/emoji-picker-core` | Stores, emoji resolution, frequency storage, labels, tokenizers, Twemoji helpers, grid model, and every public type |
| `/search` | `lexical`, `remote`, `merge`, `fallback`, `progressive`, `rerank`, `preferFrequent`, `withInterim` |
| `/data/en.json` | The English dataset |

## API

| Export | Description |
|---|---|
| `createEmojiStore(options)` | Data, search, frequents, skin tone, and labels. Options match the React provider's |
| `createPickerState(store, options)`, `moveHighlight` | Picker query, highlight, and selection. Pass `highlighted` and `onHighlightedChange` to control the highlight |
| `createEmojiSuggestions(store, options)` | Typeahead state with `getInputProps`, `getListProps`, `getOptionProps`, and IME-safe `keydown` |
| `createEmojiGrid`, `moveInGrid`, `rowsPerPage` | Grid rows and keyboard movement for a custom virtualizer |
| `resolveEmoji(store, input)` | Resolves a native emoji, shortcode, unified code, or custom id |
| `createFrequencyStore`, `localStorageAdapter`, `memoryStorage` | Frequently used emoji and `EmojiStorage` adapters |
| `localeData(locale, { shortcodes, baseUrl })` | URL of a prebuilt dataset in `@brianhung/emoji-picker-data` |
| `defaultLabels`, `localizeLabels`, `plural` | `EmojiLabels` and CLDR plural formatting |
| `findShortcodeTrigger(text)` | Finds a `:query` before the caret |
| `twemojiUrl`, `needsImageFallback` | Image URLs and native-support detection |

A ProseMirror plugin on `createEmojiSuggestions`, `findShortcodeTrigger`, `isComposingKey` and `syncCombobox` is a registry item: `npx shadcn@latest add https://emoji.brianhung.me/r/emoji-prosemirror.json` ([Tiptap example](https://emoji.brianhung.me/examples/tiptap/)).

## Data

Build a dataset for any [emojibase locale](https://emojibase.dev/docs/datasets/#supported-locales). Every locale keeps the iamcal shortcodes; `--shortcodes iamcal,cldr-native` selects other sets.

```bash
npm install --save-dev emojibase-data
npx @brianhung/emoji-picker-core build-data ja --out public/emoji/ja.json
```

`data` also accepts an `EmojiDataInput` (`locale`, `groups`, `emojis`), converted on load.

## Search adapters

`searchEngine` takes any `EmojiSearch`: `(query, { records, limit, signal, frequency, locale }) => { unified, score? }[] | Promise<…>`, best first. Build an index once per `records` array; the store passes the same array until its data changes.

```ts
import Fuse from "fuse.js";
import type { EmojiRecord, EmojiSearch } from "@brianhung/emoji-picker-core";

const indexes = new WeakMap<readonly EmojiRecord[], Fuse<EmojiRecord>>();

export const fuzzy: EmojiSearch = (query, { records, limit }) => {
  let index = indexes.get(records);
  if (!index) indexes.set(records, (index = new Fuse([...records], { keys: ["name", "shortcodes", "tags"], threshold: 0.4, includeScore: true })));
  return index.search(query, { limit }).map((r) => ({ unified: r.item.unified, score: 1 - (r.score ?? 0) }));
};
```

MiniSearch and FlexSearch follow the same pattern, indexing `name`, `shortcodes`, and `tags` with `unified` as the id.

## License

MIT. Third-party notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
