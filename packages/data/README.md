# @brianhung/emoji-picker-data

Prebuilt [Emojibase](https://emojibase.dev) datasets for [`@brianhung/emoji-picker-core`](https://www.npmjs.com/package/@brianhung/emoji-picker-core) and [`@brianhung/emoji-picker-react`](https://www.npmjs.com/package/@brianhung/emoji-picker-react), one file per locale and shortcode set at `data/<locale>/<shortcodes>.json`.

## Installation

To load the datasets from jsDelivr, no installation is needed. To self-host them or import them with a bundler, install the package:

```bash
npm i @brianhung/emoji-picker-data
```

## Usage

`localeData` from core returns a file's jsDelivr URL, pinned to the matching version of this package.

```tsx
import { localeData } from "@brianhung/emoji-picker-core";

<EmojiProvider data={localeData("ja", { shortcodes: "cldr" })} locale="ja">…</EmojiProvider>
```

To self-host, copy `data/` and pass `baseUrl`: `localeData("ja", { baseUrl: "/emoji" })` resolves to `/emoji/ja/iamcal.json`. With a bundler, import a file directly, such as `@brianhung/emoji-picker-data/ja/cldr.json`. Each file is typed as core's `Dataset`.

## Shortcode sets

`iamcal`, `cldr`, `cldr-native`, `emojibase`, `emojibase-legacy`, `github`, and `joypixels` exist for every locale, and `emojibase-native` exists where Emojibase provides it. English-only sets keep their English shortcodes in other locales.

Files use the same format as core's `en.json`. They are built from `emojibase-data` with core's `build-data` when the package is packed.

## License

MIT. The data comes from emojibase-data; see `THIRD_PARTY_NOTICES.md`.
