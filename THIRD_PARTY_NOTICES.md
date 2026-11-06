# Third-Party Notices

Each package lists its own notices: [core](packages/core/THIRD_PARTY_NOTICES.md) (Emojibase, iamcal/emoji-data, and Twemoji), [react](packages/react/THIRD_PARTY_NOTICES.md) (emoji-picker-react, Twemoji, and React Aria), and [data](packages/data/THIRD_PARTY_NOTICES.md) (Emojibase, Unicode CLDR, and iamcal/emoji-data).

## Twemoji font

`@brianhung/emoji-picker-twemoji-font` ships a font built from the [jdecked/twemoji](https://github.com/jdecked/twemoji) SVGs, Copyright 2019 Twitter, Inc and other contributors, licensed under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/). Its `LICENSE` and `NOTICE` carry the license and the changes made. The build scripts are MIT.

## Demo site

- **Twemoji.** The demo renders emoji with [jdecked/twemoji](https://github.com/jdecked/twemoji) graphics, Copyright 2019 Twitter, Inc and other contributors, licensed under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **all-the-bufo.** The custom emoji examples show images from [all-the-bufo](https://github.com/knobiknows/all-the-bufo). The images load from their source. For reduced motion, the site's Worker serves the first frame of each animated image, fetched from the same source. Neither is stored in this repository. The project publishes no license; the images belong to their creators.
- **Fluent Emoji.** The rendering demo's custom reaction images (`apps/demo/public/reactions/*.webp`) are recolored, resized images from [microsoft/fluentui-emoji](https://github.com/microsoft/fluentui-emoji), Copyright (c) Microsoft Corporation, licensed under the [MIT License](https://github.com/microsoft/fluentui-emoji/blob/main/LICENSE).
