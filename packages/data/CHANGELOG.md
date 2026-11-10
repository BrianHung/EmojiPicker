# @emoji-components/data

## 1.0.0-alpha.2

### Patch Changes

- b245ab8: Every README snippet is a complete file you can paste, and the READMEs note the prerelease.

## 1.0.0-alpha.1

### Major Changes

- f328e76: Initial release: datasets for every Emojibase locale and shortcode set at `<locale>/<shortcodes>.json`, each typed as core's `Dataset`. Core loads `en/iamcal.json` by default, and `localeData(locale, { shortcodes, baseUrl })` returns the others' jsDelivr URLs.
