---
"emoji-components": patch
"@emoji-components/core": patch
---

- Breaking (alpha): `store.packErrors()` is now `store.customEmojiErrors()`; `store.load()` runs a failed `customEmojis` loader again, and `useCustomEmojiErrors()` reads the errors.
- A rejected async search sets `error` on `EmojiSearchState`, and the list's empty state reports it as `status: "error"` with a `retry()` that searches again.
- `EmojiPicker.Root` renders a `<div role="group">` instead of an `<aside>` landmark.
- Shift+Tab no longer chooses a suggestion.
- `useTextFieldEmojiTypeahead` suggests only while its field is focused.
- `keyboardTarget` binds a ref that attaches after Root mounts.
- An outside press calls the skin tone's and variations' `onOpenChange` once.
- Data fetches abort with the store's signal.
