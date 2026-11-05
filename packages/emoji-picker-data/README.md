# @brianhung/emoji-picker-data

Prebuilt datasets for [`@brianhung/emoji-picker`](https://www.npmjs.com/package/@brianhung/emoji-picker): one file per [emojibase](https://emojibase.dev) locale and shortcode set, at `data/<locale>/<shortcodes>.json`, in the same format as core's `en.json`. The files are built from `emojibase-data` with core's `build-data` when the package is packed.

`localeData` in core returns a file's jsDelivr URL, pinned to the matching version of this package:

```tsx
import { localeData } from "@brianhung/emoji-picker-core";

<EmojiProvider data={localeData("ja", { shortcodes: "cldr" })} locale="ja">…</EmojiProvider>
```

To self-host, copy `data/` and pass `baseUrl`: `localeData("ja", { baseUrl: "/emoji" })` is `/emoji/ja/iamcal.json`. With a bundler, import a file directly: `@brianhung/emoji-picker-data/ja/cldr.json`.

Shortcode sets: `iamcal` (Slack), `cldr`, `cldr-native`, `emojibase`, `emojibase-legacy`, `github` and `joypixels` for every locale, and `emojibase-native` where emojibase has it. English-only sets keep their English shortcodes in other locales.

## License

MIT. The data comes from emojibase-data; see `THIRD_PARTY_NOTICES.md`.
