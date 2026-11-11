# emoji-components

<img alt="Emoji picker in light and dark mode" src="https://raw.githubusercontent.com/BrianHung/emoji-components/main/.github/assets/picker.svg" width="100%">

Unstyled, composable emoji picker for React.

A virtualized grid, reaction rows, and shortcode suggestions, built on [React Aria](https://react-spectrum.adobe.com/react-aria/).

## Installation

The packages are in prerelease (`1.0.0-alpha`); the API can change between alphas.

```bash
npm i emoji-components
```

## Usage

```tsx
"use client";

import { EmojiPicker } from "emoji-components";

export default function Page() {
  return (
    <EmojiPicker.Root onSelect={(selection) => console.log(selection.emoji)}>
      <EmojiPicker.Search />
      <EmojiPicker.Viewport style={{ height: 320 }} />
    </EmojiPicker.Root>
  );
}
```

Each part renders a default with no children. Hooks cover custom UI: `useEmojiPickerGrid` for your own virtualizer, `useTextFieldEmojiSuggestions` for a suggestions menu. The package renders no popovers or positioned menus; the [shadcn/ui registry](https://emoji.brianhung.me/#installation) has a styled picker, popovers, and menus as files you own.

## Entry points

| Import | Contents |
|---|---|
| `emoji-components` | `EmojiPicker.*` parts, `EmojiProvider`, `Emoji`, hooks, suggestions hooks, `emojiPickerInitialFocus` |
| `/picker`, `/emoji`, `/provider` | One component each: `EmojiPicker` with its hooks, `Emoji`, and `EmojiProvider` with its hooks |
| `/tokens.css`, `/theme.css`, `/shadcn.css` | Design tokens, Tailwind utilities for them, and a mapping to a shadcn/ui theme |

`EmojiPicker` is a one-level namespace, as in Base UI, so a Server Component can render any part through it: `EmojiPicker.SearchInput`. Parts that a function child renders, such as `ListCell` inside `List`, go in a Client Component.

Each part's data attributes and CSS variables are also exported as constants, as in Base UI: `EmojiPickerListCellDataAttributes.highlighted` is `"data-highlighted"`.

## Docs

[emoji.brianhung.me](https://emoji.brianhung.me) has the API reference, examples, and the shadcn/ui registry; [docs.md](https://emoji.brianhung.me/docs.md) is the same page as Markdown.

## License

MIT. Third-party notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
