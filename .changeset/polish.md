---
"emoji-components": patch
"@emoji-components/core": patch
"@emoji-components/data": patch
"@emoji-components/twemoji-font": patch
---

Fixes from first-install testing.

- Search ranks exact word matches above partial ones, shortcode completions break ties by use, and hiragana finds katakana words.
- The default frequently used emoji are 👍 ❤️ 😂 🎉 🙏 🔥; the Twemoji font's first subset follows them.
- A text field suggestion adds a space only when whitespace doesn't already follow.
- `hold()` freezes only a reaction row drawn from frequently used emoji; an explicit `reactions` array always shows.
- A pick that collapses `Panel` returns focus to `ReactionsExpand`. The reaction row renders from its codes before the data loads.
- `useEmojiPickerHighlight()` returns `unified`, the highlighted code with its skin tone.
- `@emoji-components/data` builds in `prepack` instead of `prepare`.
