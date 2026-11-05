<div align="center">
  <a href="https://emoji.brianhung.me">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset=".github/assets/picker-dark.png">
      <img src=".github/assets/picker-light.png" width="352" alt="The emoji picker">
    </picture>
  </a>
  <h1>EmojiPicker</h1>
  <p>A virtualized, unstyled, and composable emoji picker for React.</p>
  <p><a href="https://emoji.brianhung.me">Docs</a> · <a href="https://emoji.brianhung.me/gallery/">Gallery</a> · <a href="https://emoji.brianhung.me/examples/">Examples</a></p>
</div>

## Install

```bash
npm install @brianhung/emoji-picker
```

```tsx
import { EmojiPicker } from "@brianhung/emoji-picker";

<EmojiPicker.Root onSelect={(selection) => insert(selection.emoji)}>
  <EmojiPicker.Search />
  <EmojiPicker.Viewport>
    <EmojiPicker.List />
  </EmojiPicker.Viewport>
</EmojiPicker.Root>
```

Every part is unstyled: style it with Tailwind or CSS modules through `className` and its `data-*` state attributes.

Or copy a styled shadcn/ui component into your project:

```bash
npx shadcn@latest add https://emoji.brianhung.me/r/emoji-picker
```

## Packages

| Package | |
|---|---|
| [`@brianhung/emoji-picker`](packages/emoji-picker/README.md) | React parts and hooks |
| [`@brianhung/emoji-picker-core`](packages/emoji-picker-core/README.md) | Data, search and state, with no dependencies |
| [`@brianhung/emoji-picker-data`](packages/emoji-picker-data/README.md) | Datasets for every Emojibase locale |

See [CONTRIBUTING.md](CONTRIBUTING.md) to work on the repository.

## License

MIT. Third-party notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
