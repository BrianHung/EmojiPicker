---
"@brianhung/emoji-picker-core": major
---

Initial release: the framework-neutral half of `@brianhung/emoji-picker-react`, with no runtime dependencies. Emoji data and the `emoji-picker build-data` CLI, search (`/search`), frequently used emoji, skin tones, custom emoji, the picker's and the typeahead's state (with `findShortcodeTrigger`, `isComposingKey` and `syncCombobox` for editors), and iamcal and CLDR shortcodes. It owns every public type and extension contract: `EmojiSearch`, `EmojiStorage`, `CustomEmojiSource`, `EmojiTrigger`, the dataset format, selections and records.
