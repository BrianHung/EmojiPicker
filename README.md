<div align="center">
  <h1>Emoji Components</h1>
  <a href="https://emoji.brianhung.me">
    <img alt="Emoji picker in light and dark mode" src=".github/assets/picker.svg" width="680">
  </a>
  <p>Unstyled, composable emoji components for React.</p>
  <p><a href="https://emoji.brianhung.me">Docs</a> · <a href="https://emoji.brianhung.me/gallery/">Gallery</a> · <a href="https://emoji.brianhung.me/examples/">Examples</a></p>
</div>

## Installation

The packages are in prerelease (`1.0.0-alpha`); the API can change between alphas.

### shadcn/ui

```bash
npx shadcn@latest add https://emoji.brianhung.me/r/emoji-picker.json
```

```tsx
import { EmojiPicker, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch } from "@/components/ui/emoji-picker";

export default function App() {
  return (
    <EmojiPicker onSelect={(selection) => console.log(selection.emoji)}>
      <EmojiPickerSearch />
      <EmojiPickerContent />
      <EmojiPickerFooter />
    </EmojiPicker>
  );
}
```

### npm

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
      <EmojiPicker.Viewport style={{ height: 320 }}>
        <EmojiPicker.List />
      </EmojiPicker.Viewport>
    </EmojiPicker.Root>
  );
}
```

## Packages

| Package | Description |
|---|---|
| [`emoji-components`](packages/react/README.md) | React parts and hooks |
| [`@emoji-components/core`](packages/core/README.md) | Data, search, and state, with no dependencies |
| [`@emoji-components/data`](packages/data/README.md) | Datasets for every Emojibase locale and shortcode set; core loads its English one by default |
| [`@emoji-components/twemoji-font`](packages/twemoji-font/README.md) | Twemoji as a COLRv0 color font for the native renderer |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. Third-party notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
