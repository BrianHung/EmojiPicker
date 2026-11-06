# @brianhung/emoji-picker-data

Prebuilt [Emojibase](https://emojibase.dev) datasets, one per locale and shortcode set, at `data/<locale>/<shortcodes>.json`.

## Installation

```bash
npm i @brianhung/emoji-picker-data
```

Only needed to self-host or bundle; `localeData` loads from jsDelivr otherwise.

## Usage

```tsx
import { localeData } from "@brianhung/emoji-picker-core";

<EmojiProvider data={localeData("ja", { shortcodes: "cldr" })} locale="ja">…</EmojiProvider>
```

| Source | `data` |
|---|---|
| jsDelivr, pinned to the matching version | `localeData("ja", { shortcodes: "cldr" })` |
| Self-hosted copy of `data/` | `localeData("ja", { baseUrl: "/emoji" })` → `/emoji/ja/iamcal.json` |
| Bundler | `import ja from "@brianhung/emoji-picker-data/ja/cldr.json"` (typed as core's `Dataset`) |

## Shortcode sets

| Set | Locales |
|---|---|
| `iamcal`, `cldr`, `cldr-native`, `emojibase`, `emojibase-legacy`, `github`, `joypixels` | Every locale; English-only sets stay English |
| `emojibase-native` | Where Emojibase provides it |

Files use the format of core's `en.json`, built from `emojibase-data` with core's `build-data` on pack.

## License

MIT. The data comes from emojibase-data; see `THIRD_PARTY_NOTICES.md`.
