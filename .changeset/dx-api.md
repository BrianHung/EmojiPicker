---
"@brianhung/emoji-picker-core": major
"@brianhung/emoji-picker-react": major
---

Before release: `useEmojiTypeaheadStore` is `useEmojiTypeaheadAdapter` (`EmojiTypeaheadStore` is `EmojiTypeaheadAdapter`; `create` gets `{ id }` and returns `{ suggestions, anchor() }`). The typeahead no longer returns `keyHandler`; Root `keyboardTarget` picks on Tab while the target is an expanded combobox. `suggestions.choose(index, { record: false })` is `suggestions.insert(selection)`. `memoryStorage` is `memoryStorageAdapter`. `frequentsStorage` and `skinToneStorage` are `storage={{ frequents, skinTone }}`; `frequentsHalfLifeDays` and `frequentsMax` are `frequentsTuning={{ halfLifeDays, max }}`, on the provider and `createEmojiStore`. `pickerInitialFocus` is exported from `/floating-ui` and `/react-aria` only. Change details add `allowPropagation()` and `isPropagationAllowed`; `actionsRef` calls report `"imperative-action"`. Parts carry namespaced types (`EmojiPicker.Root.Props`).
