# @emoji-components/twemoji-font

## 1.0.0-alpha.3

### Patch Changes

- e56f95d: Fixes from first-install testing.
  
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
  - `useEmojiPickerReactions()` returns `getToolbarProps(props)`, the toolbar `Reactions` uses: role, label, and arrow, Home, and End focus. `getExpandProps` types `aria-expanded` as `boolean`.
  - The reaction row server-renders `ReactionsExpand` when a `Panel` is there.

## 1.0.0-alpha.2

### Patch Changes

- b245ab8: Every README snippet is a complete file you can paste, and the READMEs note the prerelease.

## 1.0.0-alpha.1

### Major Changes

- f328e76: Initial release: Twemoji 17.0.3 as a COLRv0 color font in `unicode-range` woff2 subsets, with `twemoji.css` declaring the `Twemoji` family. Built from the jdecked/twemoji SVGs with nanoemoji when packed. To use it with the native renderer, set `--emoji-font-family: Twemoji`.
