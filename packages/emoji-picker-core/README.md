# @brianhung/emoji-picker-core

The framework-neutral half of [`@brianhung/emoji-picker`](https://www.npmjs.com/package/@brianhung/emoji-picker), with no dependencies: emoji data, search, frequently used emoji, skin tones, the picker's and the typeahead's state, Slack shortcodes, and a ProseMirror plugin. It owns every public type and extension contract (`EmojiSearch`, `EmojiStorage`, `CustomEmojiSource`, `EmojiTrigger`, the dataset format, selections and records), so search engines, storage adapters and editor bindings can depend on it alone.

```bash
npm install @brianhung/emoji-picker-core
```

| Import | Contents |
|---|---|
| `@brianhung/emoji-picker-core` | `createEmojiStore`, `createPickerState`, `createEmojiSuggestions`, `resolveEmoji`, frequency storage, Twemoji helpers, tokenizers, labels, the grid model, and every public type |
| `@brianhung/emoji-picker-core/search` | Building blocks for `searchEngine`: `lexical`, `remote`, `merge`, `fallback`, `progressive`, `rerank`, `preferFrequent`, `withInterim` |
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

`data` also takes a hand-written `EmojiDataInput`, converted to the compact format on load:

```ts
const data: EmojiDataInput = {
  locale: "en",
  groups: [{ id: "smileys_people", label: "Smileys & People" }],
  emojis: [{ emoji: "😀", label: "grinning face", tags: ["smile"], shortcodes: ["grinning"], group: "smileys_people" }],
};
createEmojiStore({ data });
```

See the [`@brianhung/emoji-picker` README](https://github.com/BrianHung/EmojiPicker/tree/main/packages/emoji-picker#readme) for the full API.

## Bring your own search

`searchEngine` takes any `EmojiSearch`: `(query, { records, limit, signal, frequency, locale }) => hits | Promise<hits>`, where hits are `{ unified, score? }[]`, best first. Build the index once per `records` array; the store passes the same array until its data changes. Adapters compose with `merge`, `fallback`, `progressive` and `rerank` from `/search`.

MiniSearch:

```ts
import MiniSearch from "minisearch";
import type { EmojiRecord, EmojiSearch } from "@brianhung/emoji-picker-core";

const indexes = new WeakMap<readonly EmojiRecord[], MiniSearch<EmojiRecord>>();
const text = (record: EmojiRecord, field: string) => [record[field as keyof EmojiRecord]].flat().join(" ");

export const minisearch: EmojiSearch = (query, { records, limit }) => {
  let index = indexes.get(records);
  if (!index) {
    index = new MiniSearch<EmojiRecord>({ idField: "unified", fields: ["name", "shortcodes", "tags"], extractField: text, searchOptions: { prefix: true, fuzzy: 0.2, boost: { name: 2 } } });
    index.addAll(records);
    indexes.set(records, index);
  }
  return index.search(query).slice(0, limit).map((hit) => ({ unified: hit.id, score: hit.score }));
};
```

Fuse.js:

```ts
import Fuse from "fuse.js";
import type { EmojiRecord, EmojiSearch } from "@brianhung/emoji-picker-core";

const indexes = new WeakMap<readonly EmojiRecord[], Fuse<EmojiRecord>>();

export const fuzzy: EmojiSearch = (query, { records, limit }) => {
  let index = indexes.get(records);
  if (!index) {
    index = new Fuse([...records], { keys: [{ name: "name", weight: 3 }, "shortcodes", { name: "tags", weight: 0.5 }], threshold: 0.4, ignoreLocation: true, includeScore: true });
    indexes.set(records, index);
  }
  return index.search(query, { limit }).map((r) => ({ unified: r.item.unified, score: 1 - (r.score ?? 0) }));
};
```

FlexSearch:

```ts
import { Document } from "flexsearch";
import type { EmojiRecord, EmojiSearch } from "@brianhung/emoji-picker-core";

const indexes = new WeakMap<readonly EmojiRecord[], Document>();

export const flexsearch: EmojiSearch = (query, { records, limit }) => {
  let index = indexes.get(records);
  if (!index) {
    index = new Document({ tokenize: "forward", document: { id: "unified", index: ["name", "shortcodes", "tags"] } });
    for (const r of records) index.add({ unified: r.unified, name: r.name, shortcodes: r.shortcodes.join(" "), tags: r.tags.join(" ") });
    indexes.set(records, index);
  }
  const ids = new Set(index.search(query, { limit }).flatMap((field) => field.result));
  return [...ids].slice(0, limit).map((id) => ({ unified: String(id) }));
};
```

Pass one to `createEmojiStore({ searchEngine })`, or to the React provider's `searchEngine`.
