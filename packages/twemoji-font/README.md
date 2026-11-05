# @brianhung/emoji-picker-twemoji-font

[Twemoji](https://github.com/jdecked/twemoji) as a COLRv0 color font for [`@brianhung/emoji-picker-react`](https://www.npmjs.com/package/@brianhung/emoji-picker-react)'s native renderer, split into `unicode-range` subsets so a page downloads only the subsets it draws.

## Usage

```sh
npm install @brianhung/emoji-picker-twemoji-font
```

```css
@import "@brianhung/emoji-picker-twemoji-font/twemoji.css";

[data-slot="emoji-picker"] { --emoji-font-family: Twemoji; }
```

`twemoji.css` declares the `Twemoji` family with `font-display: swap`; the woff2 files resolve relative to it. The font covers emoji, ZWJ sequences, skin tones, flags and keycaps, with or without VS16. Each glyph is one em wide and fills the em box, like the image renderer.

The font maps digits, `#` and `*` for keycaps, so set it on emoji text, not on body text.

## Versions

| Package | Twemoji | Unicode emoji |
|---|---|---|
| 1.0 | 17.0.3 | 17.0 |

## License

The font is built from the Twemoji graphics, Copyright 2019 Twitter, Inc and other contributors, licensed under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/) (`LICENSE`, `NOTICE`). Apps that show it should credit Twemoji, for example in an About page or the HTML source. The build scripts are MIT.

Built in CI and when packed, from the pinned Twemoji SVGs with [nanoemoji](https://github.com/googlefonts/nanoemoji) and fontTools: `npm run build -w @brianhung/emoji-picker-twemoji-font` (Python 3.12).
