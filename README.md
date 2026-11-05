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

## shadcn/ui

```bash
npx shadcn@latest add https://emoji.brianhung.me/r/emoji-picker.json
```

```tsx
import { EmojiPickerCard } from "@/components/ui/emoji-picker";

<EmojiPickerCard onSelect={(selection) => insert(selection.emoji)} />
```

## npm

```bash
npm i @brianhung/emoji-picker-react
```

```tsx
import { EmojiPicker } from "@brianhung/emoji-picker-react";

<EmojiPicker.Root onSelect={(selection) => insert(selection.emoji)}>
  <EmojiPicker.Search />
  <EmojiPicker.Viewport>
    <EmojiPicker.List />
  </EmojiPicker.Viewport>
</EmojiPicker.Root>
```

Parts are unstyled; style them through `className` and `data-*` attributes. English data loads from jsDelivr, pinned to the installed version. See the [React README](packages/react/README.md) for providers, typeahead, and popovers.

## Packages

| Package | |
|---|---|
| [`@brianhung/emoji-picker-react`](packages/react/README.md) | React parts and hooks; depends on core |
| [`@brianhung/emoji-picker-core`](packages/core/README.md) | Data, search, and state, with no dependencies; ships English data |
| [`@brianhung/emoji-picker-data`](packages/data/README.md) | Datasets for every other Emojibase locale |

See [CONTRIBUTING.md](CONTRIBUTING.md) to work on the repository.

## License

MIT. Third-party notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
