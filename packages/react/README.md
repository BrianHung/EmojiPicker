# @brianhung/emoji-picker-react

<img alt="Emoji picker in light and dark mode" src="https://raw.githubusercontent.com/BrianHung/EmojiPicker/main/.github/assets/picker.svg" width="680">

Unstyled React components for emoji pickers, reaction rows, and shortcode typeahead, built on [React Aria](https://react-spectrum.adobe.com/react-aria/).

## Installation

```bash
npm i @brianhung/emoji-picker-react
```

Or the shadcn/ui component: `npx shadcn@latest add https://emoji.brianhung.me/r/emoji-picker.json`.

## Usage

```tsx
import { EmojiPicker } from "@brianhung/emoji-picker-react";

<EmojiPicker.Root onSelect={(selection) => insert(selection.emoji)}>
  <EmojiPicker.Search>
    <EmojiPicker.SearchInput />
  </EmojiPicker.Search>
  <EmojiPicker.Viewport style={{ height: 320 }}>
    <EmojiPicker.List />
  </EmojiPicker.Viewport>
</EmojiPicker.Root>
```

## Entry points

| Import | Contents |
|---|---|
| `@brianhung/emoji-picker-react` | `EmojiPicker.*` parts, `EmojiProvider`, `Emoji`, hooks, typeahead hooks, `pickerInitialFocus` |
| `/floating-ui`, `/react-aria` | `EmojiPopover` and `EmojiSuggestions` (`Root`, `Portal`, `Positioner`, `Popup`) on either positioning library |
| `/picker`, `/emoji`, `/provider` | One component each: `EmojiPicker` with its hooks, `Emoji`, and `EmojiProvider` with its hooks |
| `/popover/floating-ui`, `/popover/react-aria`, `/suggestions/floating-ui`, `/suggestions/react-aria` | `EmojiPopover` or `EmojiSuggestions` alone |
| `/tokens.css`, `/theme.css`, `/shadcn.css` | Design tokens, Tailwind utilities for them, and a mapping to a shadcn/ui theme |

`EmojiPicker`, `EmojiPopover`, and `EmojiSuggestions` are one-level namespaces, as in Base UI, so a Server Component can render any part through them: `EmojiPicker.SearchInput`, `EmojiPopover.Positioner`. Parts that a function child renders, such as `ListCell` inside `List`, go in a Client Component.

Each part's data attributes and CSS variables are also exported as constants, as in Base UI: `EmojiPickerListCellDataAttributes.highlighted` is `"data-highlighted"`.

## Docs

[emoji.brianhung.me](https://emoji.brianhung.me) has the API reference, examples, and the shadcn/ui registry; [docs.md](https://emoji.brianhung.me/docs.md) is the same page as Markdown.

## License

MIT. Third-party notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
