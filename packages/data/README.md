# @emoji-components/data

Prebuilt [Emojibase](https://emojibase.dev) datasets, one per locale and shortcode set, at `data/<locale>/<shortcodes>.json`.

## Installation

```bash
npm i @emoji-components/data
```

Only needed to self-host or bundle: core loads `en/iamcal.json` from jsDelivr by default, and `localeData` points at the others.

## Usage

```tsx
import { EmojiProvider, localeData } from "emoji-components";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <EmojiProvider data={localeData("ja", { shortcodes: "cldr" })} locale="ja">
      {children}
    </EmojiProvider>
  );
}
```

| Source | `data` |
|---|---|
| jsDelivr, pinned to the matching version | `localeData("ja", { shortcodes: "cldr" })` |
| Self-hosted copy of `data/` | `localeData("ja", { baseUrl: "/emoji" })` → `/emoji/ja/iamcal.json` |
| Bundler | `import ja from "@emoji-components/data/ja/cldr.json"` (typed as core's `Dataset`) |

## Shortcode sets

| Set | Locales |
|---|---|
| `iamcal`, `cldr`, `cldr-native`, `emojibase`, `emojibase-legacy`, `github`, `joypixels` | Every locale; English-only sets stay English |
| `emojibase-native` | Where Emojibase provides it |

Files are core's `Dataset` format, built from `emojibase-data` with core's `build-data` on pack.

## License

MIT. The data comes from emojibase-data; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
