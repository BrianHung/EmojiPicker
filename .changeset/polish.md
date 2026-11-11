---
"emoji-components": patch
"@emoji-components/core": patch
"@emoji-components/data": patch
"@emoji-components/twemoji-font": patch
---

Fixes from first-install testing.

- Search ranks exact word matches above partial ones, shortcode completions break ties by use, and hiragana finds katakana words.
- A text field suggestion adds a space only when whitespace doesn't already follow.
- `hold()` freezes only a reaction row drawn from frequently used emoji; an explicit `reactions` array always shows.
- A pick that collapses `Panel` returns focus to `ReactionsExpand`. The reaction row renders from its codes before the data loads.
- `useEmojiPickerHighlight()` returns `unified`, the highlighted code with its skin tone.
- `@emoji-components/data` builds in `prepack` instead of `prepare`.
- A cell may draw outside its box, such as a highlight or focus ring that extends past the cell, instead of being clipped.
- `localeData` resolves a BCP 47 tag to the nearest dataset folder (`en-US` → `en`, `zh-TW` → `zh-hant`, `es-419` → `es-mx`), including with `baseUrl`.
- Without `data`, `EmojiProvider` loads the dataset for its `locale` instead of English.
- Frequently used starts empty; pass `defaultFrequents` to seed it. A `reactions={n}` row with no history shows `Panel` in its place. The Twemoji font's first subset no longer includes starter emoji.
- The default `previewCaption` is "Pick an emoji".
- A localized dataset names Smileys & People from both of its emojibase groups, such as "スマイリーと感情、人と体".
