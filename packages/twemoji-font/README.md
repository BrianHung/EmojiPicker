# @brianhung/emoji-picker-twemoji-font

[Twemoji](https://github.com/jdecked/twemoji) as a COLRv0 color font for [`@brianhung/emoji-picker-react`](https://www.npmjs.com/package/@brianhung/emoji-picker-react)'s native renderer, split into `unicode-range` subsets so a page downloads only the subsets it draws.

## Installation

```sh
npm i @brianhung/emoji-picker-twemoji-font
```

## Usage

```css
@import "@brianhung/emoji-picker-twemoji-font/twemoji.css";

[data-slot="emoji-picker"] { --emoji-font-family: Twemoji; }
```

`twemoji.css` declares the `Twemoji` family with `font-display: swap`. The woff2 files resolve relative to it. The font covers emoji, ZWJ sequences, skin tones, flags, and keycaps, with or without VS16. Each glyph is one em wide and fills the em box, like the image renderer.

The font maps digits, `#`, and `*` for keycaps, so set it on emoji text, not on body text.

## System font

`dist/Twemoji.ttf` is the whole font in one TrueType file, with the same glyphs, sequences, and metrics as the web font. It is also exported as `@brianhung/emoji-picker-twemoji-font/Twemoji.ttf`.

- **Linux.** Copy the file to `~/.local/share/fonts` and run `fc-cache -f`. Color requires FreeType 2.10 or later. To prefer it for emoji, save this as `~/.config/fontconfig/conf.d/50-twemoji.conf`:

  ```xml
  <?xml version="1.0"?>
  <!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
  <fontconfig>
    <alias binding="same">
      <family>emoji</family>
      <prefer><family>Twemoji</family></prefer>
    </alias>
  </fontconfig>
  ```

- **Windows.** Open the file and choose Install. Apps that draw text with DirectWrite on Windows 8.1 or later show it in color when Twemoji is the selected font. Windows keeps Segoe UI Emoji as the system emoji fallback.
- **macOS.** Open the file in Font Book and choose Install. Apps show it in color when Twemoji is the selected font. macOS keeps Apple Color Emoji as the system emoji fallback.

Renderers without COLR support, such as GDI, draw the glyphs blank.

## Versions

| Package | Twemoji | Unicode emoji |
|---|---|---|
| 1.0 | 17.0.3 | 17.0 |

## License

The font is built from the Twemoji graphics, Copyright 2019 Twitter, Inc and other contributors, licensed under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/) (`LICENSE`, `NOTICE`). Apps that show it should credit Twemoji, for example in an About page or the HTML source. The build scripts are MIT.
