# emoji-components

## 1.0.0-alpha.1

### Major Changes

- f328e76: Initial release. Unstyled, composable emoji components for React, with Base UI's API shape on React Aria's behavior.
  - `EmojiPicker`: a virtualized picker with search, category navigation, skin tones, a reaction row, and a preview.
  - `EmojiPopover` (from `/floating-ui` or `/react-aria`) and `EmojiSuggestions`, a shortcode typeahead at the caret.
  - `Emoji` and `EmojiProvider`, which holds data, search, locale, frequently used emoji, and skin tone.
  - Copy-in components in the shadcn registry.
  - ESM-only, for React 18.2 and 19; parts render from Server Components.

  Docs: https://emoji.brianhung.me

### Patch Changes

- Updated dependencies [f328e76]
  - @emoji-components/core@1.0.0-alpha.1
