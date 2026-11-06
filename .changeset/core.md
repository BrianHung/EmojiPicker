---
"@brianhung/emoji-picker-core": major
---

Initial release: framework-neutral emoji data, search, frequently used emoji, skin tones, custom emoji, and typeahead state, with no runtime dependencies. `createEmojiStore` returns an `EmojiStore` with `setOptions`, `load`, `prepare`, search, and frequently used emoji (`pick`, `remove`, `clear`), and `deferStorage` for server-rendered pages. `createEmojiSuggestions` drives editor typeaheads, including `syncCombobox(el)`, and `createSearch` gives search-as-you-type state. Includes `data/en.json` (typed as `Dataset`), the `emoji-picker build-data` CLI, and composable search engines at `/search`.
