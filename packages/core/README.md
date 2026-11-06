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
store.subscribe(render);
await store.load();
store.query("heart");

const typeahead = createEmojiSuggestions(store, { onChoose: (s) => insert(typeahead.textFor(s)), onSelect: (selection) => track(selection) });
typeahead.subscribe(render);
typeahead.setQuery("tada");
input.addEventListener("keydown", (e) => typeahead.keydown(e));
const stop = typeahead.syncCombobox(input);

const picker = createEmojiPicker(store, { frequent: 16 });
picker.subscribe(() => render(picker.getSnapshot().sections));
picker.setQuery("cat");
picker.choose(picker.getSnapshot().sections[0]?.items[0]?.id);
```

## Entry points

| Import | Contents |
|---|---|
| `@brianhung/emoji-picker-core` | The store, emoji resolution, frequently used emoji, search, typeahead, and picker state, labels, tokenizers, Twemoji helpers, and their types |
| `/search` | `lexical`, `remote`, `merge`, `fallback`, `progressive`, `rerank`, `preferFrequent`, `withInterim` |
| `/grid` | Grid and strip layout math and keyboard navigation: `createEmojiGrid`, `moveInGrid`, `layoutStrip`, `moveInStrip`, `createGridNavigation` |
| `/native` | Whether the system font draws an emoji: `nativeProbe`, `nativeSupport`, `drawsNatively`, `needsImageFallback` |
| `/data/en.json` | The English dataset |

## API

| Export | Description |
|---|---|
| `createEmojiStore(options)` | An `EmojiStore`: data, search, frequently used emoji, skin tone, and labels. Options match the React provider's, plus `deferStorage` (read storage on the first `subscribe`, so a server-rendered page hydrates with the defaults). `data` defaults to `data/en.json` on jsDelivr, pinned to this version. |
| `store.setOptions(options)` | Updates `data`, `customEmojis`, `filter`, `searchEngine`, `locale`, and controlled `skinTone` and `frequents` with their callbacks. A loader function counts as the same source until `locale` changes. |
| `store.load()`, `store.prepare()`, `store.status()`, `store.error()` | Load the data now, or when the browser is idle along with the search index |
| `store.query(text)`, `store.completeShortcode(prefix)`, `store.select(unified, { count? })` | Search, shortcode completion, and an `EmojiSelection` (`count: false` skips frequently used) |
| `store.get(unified)`, `store.fromShortcode(code)`, `store.records()`, `store.replaceShortcodes(text)` | Lookups |
| `store.skinTone()`, `store.setSkinTone(tone)`, `store.withSkinTone(unified)` | The shared skin tone |
| `store.frequents` | `pick`, `remove`, `clear`, `top(n)`, `score`, `entries()`. Entries are `Record<unified, { count, lastUsed }>`; `count` halves every `frequentsTuning.halfLifeDays` days (default 14). The six default entries can be removed. |
| `EmojiSearch` | `(query, { records, limit, signal, frequency, locale }) => { unified, score? }[] \| Promise<…>`, best first; the store's `searchEngine` |
| `store.version()` | Changes with the records, locale, or search engine |
| `createSearch(store, { query, limit }?)` | Search-as-you-type: `setQuery(query, limit)` starts a search, `getSnapshot()` returns `{ results, pending }`, `subscribe` fires when one settles |
| `createEmojiPicker(store, options)` | The picker's headless state. `getSnapshot()` returns sections, search, highlight, collapsed categories, variations, and reaction rows; `setOptions` takes changed values (`query`, `highlight`, `collapsedCategories` are controlled when given); `setQuery`, `highlight`, `toggleCollapsed`, `choose` act and call the `onXChange` callbacks |
| `createEmojiSuggestions(store, options)` | Typeahead state: `getInputProps`, `getListProps`, `getOptionProps`, IME-safe `keydown`, `syncCombobox(el)` for an element you don't render. `choose(index?)` inserts and counts a suggestion; `insert(selection)` writes one already counted. Both call `onChoose` and `onSelect(selection)`. |
| `resolveEmoji(store, input)`, `missingEmojiText(input)` | Resolves a native emoji, shortcode, unified code, or custom id; text for unresolved input |
| `isDataset(data)`, `isCustomEmoji(value)` | Type guards: a prebuilt `Dataset` rather than an `EmojiDataInput`; a `CustomEmoji` input |
| `customRecord(custom)`, `SKIN_TONE_VALUES` | The `EmojiRecord` a `CustomEmoji` becomes; the skin tone values `0` to `5` |
| `mergeFrequents(a, b, tuning?)` | Merges two histories, such as a server's and this device's |
| `localStorageAdapter(key)`, `memoryStorageAdapter()` | `EmojiStorage` adapters for `storage`; `localStorageAdapter` syncs across tabs |
| `createChangeDetails(reason, event)` | The `{ reason, event, cancel(), isCanceled, allowPropagation(), isPropagationAllowed }` every `onXChange` receives |
| `localeData(locale, { shortcodes, baseUrl })` | URL of a `@brianhung/emoji-picker-data` dataset. `shortcodes` defaults to `"iamcal"` (English in every locale). |
| `defaultLabels`, `localizeLabels(overrides)`, `nameWithTone` | The English `EmojiLabels` with overrides, and names with a skin tone |
| `findShortcodeTrigger(text)`, `isComposingKey` | Finds a `:query` before the caret; the IME check for editor typeaheads |
| `KEY_MOVES`, `flipForRtl` | Keys to `EmojiGridMove`s |
| `syncAriaAttributes(el, read, subscribe)` | Writes attributes onto an element the app renders while `read()` returns them; restores it after |
| `createTokenizer`, `normalizer` | Locale-aware tokenizing and folding |
| `twemojiUrl`, `TWEMOJI_BASE_URL`, `TWEMOJI_EMOJI_VERSION` | Twemoji image URLs |
| `withTone`, `withoutTone`, `withoutFe0f`, `nativeToUnified`, `unifiedToNative`, `isUnified` | Convert between native emoji and unified codes, and add or remove skin tones |
| `GROUPS` | Emojibase group ids in order |

ProseMirror plugin: `npx shadcn@latest add https://emoji.brianhung.me/r/emoji-prosemirror.json` ([Tiptap example](https://emoji.brianhung.me/examples/tiptap/)).

## Data

```bash
npm i -D emojibase-data
npx @brianhung/emoji-picker-core build-data ja --out public/emoji/ja.json
```

| Source | Description |
|---|---|
| `/data/en.json` | Included English dataset |
| [`@brianhung/emoji-picker-data`](https://github.com/BrianHung/EmojiPicker/tree/main/packages/data#readme) | Every Emojibase locale and shortcode set, via `localeData` |
| `build-data <locale>` | Any [Emojibase locale](https://emojibase.dev/docs/datasets/#supported-locales). Shortcodes: iamcal for English, iamcal and CLDR otherwise; `--shortcodes` takes a priority list such as `iamcal,cldr-native`. |
| `EmojiDataInput` | `{ locale, groups, emojis }`, accepted by `data` and converted on load |

## Search adapters

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

`records` keeps the same identity until the data changes, so index once per array.

## License

MIT. Third-party notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
