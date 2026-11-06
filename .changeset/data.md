---
"@brianhung/emoji-picker-data": major
---

Initial release: datasets for every Emojibase locale and shortcode set at `<locale>/<shortcodes>.json`, each typed as core's `Dataset`. Core loads `en/iamcal.json` by default, and `localeData(locale, { shortcodes, baseUrl })` returns the others' jsDelivr URLs.
