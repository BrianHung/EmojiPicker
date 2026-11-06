---
"@brianhung/emoji-picker-react": major
---

Initial release: unstyled React parts for emoji pickers, reaction rows, and shortcode typeahead, with Base UI's API shape (parts with `render`, `className`, and `style` as functions of state, `x`/`defaultX`/`onXChange(value, eventDetails)`, `actionsRef`, empty-string state attributes, and `preventEmojiPickerHandler()` on every composed handler) and React Aria's behavior, with copy-in components in the shadcn registry. Includes popover adapters for Floating UI (`/floating-ui`) and React Aria (`/react-aria`) with the same props, typeahead hooks for text fields and any editor, and a shared store for parts and hooks outside an `EmojiProvider`. The entry points are ESM-only client modules and support React 18.2 and 19.
