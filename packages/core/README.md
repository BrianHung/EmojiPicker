# @brianhung/emoji-picker-core

Framework-neutral data, search, and state for [`@brianhung/emoji-picker-react`](https://www.npmjs.com/package/@brianhung/emoji-picker-react), with no dependencies. React apps install only `@brianhung/emoji-picker-react`, which depends on this package.

## Installation

```bash
npm i @brianhung/emoji-picker-core@alpha
```

The packages are in prerelease and are published under the `alpha` tag.

## Usage

`createEmojiStore`, `createEmojiSuggestions`, and `createSearch` return stores with `subscribe(listener)` and methods to read and act on them.

```ts
import { createEmojiStore, createEmojiSuggestions } from "@brianhung/emoji-picker-core";

const store = createEmojiStore();
store.subscribe(render);
await store.load();
store.query("heart");

const typeahead = createEmojiSuggestions(store, { onChoose: (s) => insert(typeahead.textFor(s)), onSelect: (selection) => track(selection) });
typeahead.subscribe(render);
typeahead.setQuery("tada");
input.addEventListener("keydown", (e) => typeahead.keydown(e));
const stop = typeahead.syncCombobox(input);
```

The picker's own state is part of the React package.

## Entry points

| Import | Contents |
|---|---|
| `@brianhung/emoji-picker-core` | The store, emoji resolution, frequently used emoji, search and typeahead state, labels, tokenizers, Twemoji helpers, and their types |
| `/search` | `lexical`, `remote`, `merge`, `fallback`, `progressive`, `rerank`, `preferFrequent`, `withInterim` |
| `/data/en.json` | The English dataset |

## API

| Export | Description |
|---|---|
| `createEmojiStore(options)` | An `EmojiStore`: data, search, frequently used emoji, skin tone, and labels. Options match the React provider's, including `storage: { frequents?, skinTone? }`, `frequentsTuning: { halfLifeDays?, max? }`, and `deferStorage` (read storage on the first `subscribe`, so a server-rendered page hydrates with the defaults); `data` defaults to `data/en.json` on jsDelivr, pinned to this version |
| `store.setOptions(options)` | Replaces the options that change after creation: `data`, `customEmojis`, `filter`, `searchEngine`, `locale`, and controlled `skinTone` and `frequents` with their callbacks. A loader function counts as the same source until `locale` changes. |
| `store.load()`, `store.prepare()`, `store.status()`, `store.error()` | Load the data now, or when the browser is idle along with the search index |
| `store.query(text)`, `store.completeShortcode(prefix)`, `store.select(unified, { count? })` | Search, shortcode completion, and an `EmojiSelection` (`count: false` skips frequently used) |
| `createSearch(store)` | Search-as-you-type state: `run(query, limit)` returns `{ results, pending }`, and `subscribe` hears when an async search settles |
| `createEmojiSuggestions(store, options)` | Typeahead state with `getInputProps`, `getListProps`, `getOptionProps`, IME-safe `keydown`, and `syncCombobox(el)` for an editor element you don't render. `choose(index?)` inserts a suggestion and counts it as used; `insert(selection)` only writes a selection another UI already counted. Both call `onChoose` and `onSelect(selection)` |
| `resolveEmoji(store, input)` | Resolves a native emoji, shortcode, unified code, or custom id |
| `store.frequents` | `pick`, `remove`, `clear`, `top(n)`, `score`, `entries()`. Entries are `Record<unified, { count, lastUsed }>`; `count` halves every `frequentsTuning.halfLifeDays` days (default 14). The six default entries can be removed. |
| `mergeFrequents(a, b, tuning?)` | Merges two histories, such as a server's and this device's |
| `localStorageAdapter(key)`, `memoryStorageAdapter()` | `EmojiStorage` adapters for `storage`; `localStorageAdapter` syncs across tabs |
| `createChangeDetails(reason, event)` | The `{ reason, event, cancel(), isCanceled, allowPropagation(), isPropagationAllowed }` every `onXChange` receives |
| `localeData(locale, { shortcodes, baseUrl })` | The URL of a prebuilt dataset in `@brianhung/emoji-picker-data` |
| `defaultLabels`, `localizeLabels`, `plural` | `EmojiLabels` and CLDR plural formatting |
| `findShortcodeTrigger(text)` | Finds a `:query` before the caret |
| `twemojiUrl` | Twemoji image URLs |
| `withTone`, `withoutTone`, `nativeToUnified`, `unifiedToNative` | Convert between native emoji and unified codes, and add or remove skin tones |
| `isComposingKey` | The IME check for editor typeaheads |

A ProseMirror plugin built on `createEmojiSuggestions`, `findShortcodeTrigger`, and `syncCombobox` is available from the registry: `npx shadcn@latest add https://emoji.brianhung.me/r/emoji-prosemirror.json` ([Tiptap example](https://emoji.brianhung.me/examples/tiptap/)).

## Data

This package includes the English dataset (`/data/en.json`). [`@brianhung/emoji-picker-data`](https://github.com/BrianHung/EmojiPicker/tree/main/packages/data#readme) has every other locale, and `localeData(locale)` returns its URL. To build a dataset for any [Emojibase locale](https://emojibase.dev/docs/datasets/#supported-locales), run `build-data`. By default, English uses iamcal shortcodes and other locales use iamcal and CLDR. `--shortcodes` takes a comma-separated list in priority order, such as `iamcal,cldr-native`.

```bash
npm install --save-dev emojibase-data
npx @brianhung/emoji-picker-core build-data ja --out public/emoji/ja.json
```

`data` also accepts an `EmojiDataInput` (`locale`, `groups`, `emojis`), converted on load.

## Search adapters

`searchEngine` takes any `EmojiSearch`: `(query, { records, limit, signal, frequency, locale }) => { unified, score? }[] | Promise<…>`, best first. Build an index once per `records` array. The store passes the same array until its data changes.

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
