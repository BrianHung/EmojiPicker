# @emoji-components/twemoji-font

[Twemoji](https://github.com/jdecked/twemoji) as a COLRv0 color font, split into `unicode-range` subsets.

## Installation

```bash
npm i @emoji-components/twemoji-font
```

## Usage

```css
@import "@emoji-components/twemoji-font/twemoji.css";

[data-slot="emoji-picker"] { --emoji-font-family: Twemoji; }
```

| Property | Value |
|---|---|
| Family | `Twemoji`, `font-display: swap`; woff2 files resolve relative to `twemoji.css` |
| Coverage | Emoji, ZWJ sequences, skin tones, flags, keycaps, with or without VS16 |
| Metrics | One em wide, filling the em box, like the image renderer |
| Digits, `#`, `*` | Mapped for keycaps; set the font on emoji text only |

## System font

`dist/Twemoji.ttf` (export `@emoji-components/twemoji-font/Twemoji.ttf`) is the whole font in one file.

- **Linux.** Copy the file to `~/.local/share/fonts` and run `fc-cache -f` (color needs FreeType 2.10+). To prefer it for emoji, save as `~/.config/fontconfig/conf.d/50-twemoji.conf`:

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

- **Windows.** Open the file and choose Install. Color in DirectWrite apps on Windows 8.1 or later when Twemoji is selected; Segoe UI Emoji stays the system fallback.
- **macOS.** Open the file in Font Book and choose Install. Color when Twemoji is selected; Apple Color Emoji stays the system fallback.
- **GDI and other renderers without COLR** draw the glyphs blank.

## Versions

| Package | Twemoji | Unicode emoji |
|---|---|---|
| 1.0 | 17.0.3 | 17.0 |

## License

The font is built from the Twemoji graphics, Copyright 2019 Twitter, Inc and other contributors, licensed under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/) (`LICENSE`, `NOTICE`). Apps that show it should credit Twemoji, for example in an About page or the HTML source. The build scripts are MIT.
