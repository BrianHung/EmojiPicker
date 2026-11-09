# @emoji-components/core

## 1.0.0-alpha.1

### Major Changes

- f328e76: Initial release. Framework-neutral emoji logic with no runtime dependencies.
  - `createEmojiStore`: data loading, search (`lexicalSearch()` by default, or any `EmojiSearch`), custom emoji, frequently used emoji, and skin tone.
  - `createEmojiPicker` and `createEmojiSuggestions`: picker and shortcode-typeahead state for any framework.
  - `/grid` and `/native` for the grid model and native emoji support detection.
  - `npx @emoji-components/core build-data` builds a dataset from Emojibase for any locale.

  Docs: https://emoji.brianhung.me
