<div align="center">
  <h1>Emoji Picker</h1>
  <a href="https://emoji.brianhung.me">
    <img alt="Emoji picker in light and dark mode" src=".github/assets/picker.svg" width="680">
  </a>
  <p>A virtualized, unstyled, and composable emoji picker for React.</p>
  <p><a href="https://emoji.brianhung.me">Docs</a> · <a href="https://emoji.brianhung.me/gallery/">Gallery</a> · <a href="https://emoji.brianhung.me/examples/">Examples</a></p>
</div>

## Installation

### shadcn/ui

```bash
npx shadcn@latest add https://cdn.jsdelivr.net/npm/emoji-components@latest/r/emoji-picker.json
```

```tsx
import { EmojiPickerCard } from "@/components/ui/emoji-picker";

<EmojiPickerCard onSelect={(selection) => insert(selection.emoji)} />
```

### npm

```bash
npm i emoji-components
```

## Usage

```tsx
import { EmojiPicker } from "emoji-components";

<EmojiPicker.Root onSelect={(selection) => insert(selection.emoji)}>
  <EmojiPicker.Search />
  <EmojiPicker.Viewport style={{ height: 320 }}>
    <EmojiPicker.List />
  </EmojiPicker.Viewport>
</EmojiPicker.Root>
```

## Packages

| Package | Description |
|---|---|
| [`emoji-components`](packages/react/README.md) | React parts and hooks |
| [`@emoji-components/core`](packages/core/README.md) | Data, search, and state, with no dependencies |
| [`@emoji-components/data`](packages/data/README.md) | Datasets for every Emojibase locale and shortcode set; core loads its English one by default |
| [`@emoji-components/twemoji-font`](packages/twemoji-font/README.md) | Twemoji as a COLRv0 color font for the native renderer |

[Contributing](CONTRIBUTING.md)

## License

MIT. Third-party notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
