# @brianhung/emoji-picker-react

Unstyled React components for emoji pickers, tapbacks, and shortcode autocomplete, built on [React Aria](https://react-spectrum.adobe.com/react-aria/).

## Installation

```bash
npm install @brianhung/emoji-picker-react @brianhung/emoji-picker-core
```

## Usage

```tsx
import { EmojiPicker, EmojiProvider, Tapback } from "@brianhung/emoji-picker-react";
import en from "@brianhung/emoji-picker-core/data/en.json?url";

<EmojiProvider data={en}>
  <EmojiPicker.Root onSelect={(selection) => insert(selection.emoji)}>
    <EmojiPicker.Search>
      <EmojiPicker.Search.Input />
      <EmojiPicker.SkinTone />
    </EmojiPicker.Search>
    <EmojiPicker.Viewport>
      <EmojiPicker.List />
      <EmojiPicker.Empty>No emoji found.</EmojiPicker.Empty>
    </EmojiPicker.Viewport>
  </EmojiPicker.Root>
  <Tapback onSelect={(selection) => react(selection.unified)} />
</EmojiProvider>
```

A styled shadcn/ui version: `npx shadcn@latest add https://emoji.brianhung.me/r/emoji-picker.json` (adds `EmojiPickerCard`, `EmojiTapback`, `EmojiPickerBody`, `EmojiPickerFooter`). Add `emoji-picker-popover.json` (Base UI or Radix) or `emoji-picker-popover-aria.json` (React Aria) for `EmojiPickerPopover`.

## Entry points

| Import | Contents |
|---|---|
| `@brianhung/emoji-picker-react` | Components, hooks, and common core types |
| `/floating-ui`, `/react-aria` | `EmojiPopover`, `EmojiSuggestions.Popover`; `@floating-ui/react` is an optional peer |
| `/tokens.css`, `/theme.css`, `/shadcn.css` | Color tokens, Tailwind v4 utilities, shadcn/ui bridge |
| `@brianhung/emoji-picker-core` | Data, search, stores, and every public type, without React ([README](https://github.com/BrianHung/EmojiPicker/tree/main/packages/core#readme)) |

## Parts

```
Root
├ Search        Search.Input, Search.Clear
├ SkinTone      SkinTone.Trigger, SkinTone.Options {(tone) => SkinTone.Option}, SkinTone.Glyph
├ CategoryNav   {(category) => CategoryNav.Tab}
├ Viewport
│ ├ List        {(section) => List.Section}
│ │ └ Section   List.SectionTitle, List.Items {(emoji) => List.Cell}, List.SectionActions
│ └ Empty, Loading, LoadError
├ Preview       {({ emoji }) => …}
├ Reactions     {(emoji) => Reactions.Item}, or Reactions.Items and Reactions.Expand
└ Panel
```

Each part renders a default when it has no children, and takes `render` (an element or `(props, state) => element`), `className`, and `style` (values or functions of state). Parts are also exported individually (`EmojiPickerRoot`, `EmojiPickerList`, …). Hooks inside `Root`: `useActiveEmoji`, `useCategoryNavigation`, `useCollapsedCategories`, `useSearchState`.

| `Root` prop | Description |
|---|---|
| `onSelect` | Receives an `EmojiSelection` (`emoji`, `unified`, `baseUnified`, `name`, `shortcode`, `shortcodes`, `skinTone`, `isCustom`, `imageUrl`) |
| `query`, `value`, `highlighted`, `reactionsOpen`, `collapsedCategories` | Controllable as `x` / `defaultX` / `onXChange` |
| `categories`, `frequent`, `suggested`, `emojiVersion` | Section order, names, icons (`nav: false` hides a tab), frequents, and filtering |
| `columns`, `fitColumns` | Fixed column count; `fitColumns={false}` keeps it when the width is short |
| `searchResults`, `searchLimit` | `"ranked"` (one list) or `"grouped"` (sections in rank order) |
| `keymap`, `focusModel`, `pointerModel` | See [Keyboard](#keyboard) |
| `disableVariations` | Disables the long-press skin-tone menu |

`List.SectionActions` renders controls over a sticky title, outside the listbox; its `toggle` and `toggleProps` collapse the section. `<List orientation="horizontal" rows={5} />` lays sections side by side; `searchRows` sets rows for results.

**Custom virtualizer.** Call `useEmojiGrid({ rowHeight, headerHeight, columns, scrollToIndex })` inside `Root` in place of `List`, and `useEmojiCell(state, item)` per cell; keyboard, highlight, and variations are unchanged. See [Virtualizer](https://emoji.brianhung.me/examples/virtualizer/).

## Provider

`EmojiProvider` holds the data, search index, frequents, and skin tone for every picker below it. `Root` creates one with defaults when none is present.

| Prop | Description |
|---|---|
| `data` | URL, `Dataset`, `EmojiDataInput`, or `({ signal }) => Promise<Dataset>`. Default: `data/en.json` from jsDelivr, pinned to the core version |
| `locale`, `labels`, `collator` | Search folding and segmentation, result-count formatting, text direction, and `EmojiLabels` strings |
| `searchEngine` | An `EmojiSearch`; see [Search](#search) |
| `customEmojis` | A `CustomEmoji`, pack URL, loader, or an array of them; see [Custom emoji](https://emoji.brianhung.me/examples/custom-emoji/) |
| `filter` | `(record) => boolean`; removes emoji from pickers and search |
| `skinTone`, `defaultSkinTone`, `onSkinToneChange`, `skinToneStorage` | Shared skin tone; persisted to localStorage unless `skinToneStorage={null}` |
| `frequents` | A `FrequencyStore` from `createFrequencyStore`. Pickers and `useFrequentEmoji` skip entries the current data or custom emoji don't include, so history survives switching packs |
| `renderer`, `imageUrl`, `imageVersion` | `"auto"` (default) uses images only where the system cannot draw an emoji; images default to Twemoji |

Changing a prop updates the provider in place. Pass functions and objects with stable identity. A dataset object without `customEmojis` renders on the first pass, including on the server.

## Data

`data/en.json` has 1,923 emoji from emojibase with iamcal shortcodes (192 KB, 50 KB gzipped). Build another locale with `npx @brianhung/emoji-picker-core build-data ja --out public/emoji/ja.json` (requires `emojibase-data`), or load a prebuilt file with `localeData("ja", { shortcodes: "cldr" })` from [`@brianhung/emoji-picker-data`](https://github.com/BrianHung/EmojiPicker/tree/main/packages/data#readme). Every locale keeps the iamcal shortcodes.

## Search

A search is `(query, { records, limit, signal, frequency, locale }) => { unified, score? }[] | Promise<…>`, best first. Compose engines from `@brianhung/emoji-picker-core/search`:

| Function | Description |
|---|---|
| `lexical({ typos, typoThreshold, locale, segmenter, tokenize })` | Default. Word index over shortcodes, names, and tags, with typo correction |
| `fallback(primary, secondary, { min })` | Uses `secondary` when `primary` returns fewer than `min` |
| `merge(...searches)` | Reciprocal rank fusion |
| `rerank(search, ...rerankers)`, `preferFrequent({ weight })` | Reorders results |
| `progressive(fast, slow)`, `withInterim(promise, hits)` | Shows fast results until slow ones arrive |
| `remote(fetcher)` | Any async source of hits |

Embedding search: [Semantic search](https://emoji.brianhung.me/examples/semantic-search/). Third-party engine adapters: [core README](https://github.com/BrianHung/EmojiPicker/tree/main/packages/core#search-adapters). `useEmojiSearch` and `useEmojiSearchState` query the provider outside a picker.

## Popovers

`EmojiPopover` (from `/floating-ui` or `/react-aria`) positions, flips, and shifts its content, closes on Escape, outside click, or pick (`closeOnSelect={false}` to keep it open), and restores focus to the trigger or `finalFocus`. `anchor` accepts an element, virtual element, or rect function.

```tsx
<EmojiPopover.Root>
  <EmojiPopover.Trigger>🙂</EmojiPopover.Trigger>
  <EmojiPopover.Content side="top" align="end">
    <EmojiPicker.Root onSelect={insert}>…</EmojiPicker.Root>
  </EmojiPopover.Content>
</EmojiPopover.Root>
```

Content exposes `data-starting-style`, `data-ending-style`, `data-state`, `data-side`, `data-align`, `--transform-origin`, `--available-width`, and `--available-height` for CSS transitions.

**Custom popover.** Put the picker in any popover, set initial focus to `pickerInitialFocus(content)`, and close from `onSelect`. Escape clears the query before it reaches the popover.

## Editors and typeahead

Each hook returns an `EmojiTypeahead` (`query`, `open`, `anchor`, `suggestions`, `dismiss`); render `suggestions` with its `getListProps` and `getOptionProps`, optionally inside `EmojiSuggestions.Popover`. Options: `matchBy` (`"shortcode"`, `"search"`), `order` (`"relevance"`, `"alphabetical"`), `columns`, `limit`.

| Hook | Target |
|---|---|
| `useTextFieldEmojiTypeahead(ref, options)` | `<input>`, `<textarea>` |
| `useEmojiTypeahead({ query, anchor, replace }, options, element)` | Any editor; `findShortcodeTrigger(textBeforeCaret)` finds the query |
| `useEmojiSuggestions({ query, onChoose })` | Suggestions state only |

Tiptap, Lexical and ProseMirror adapters are registry items (`emoji-tiptap.json`, `emoji-lexical.json`, `emoji-prosemirror.json`), built on these hooks: see the [Tiptap](https://emoji.brianhung.me/examples/tiptap/) and [Lexical](https://emoji.brianhung.me/examples/lexical/) examples.

## Tapbacks and emoji

| Export | Description |
|---|---|
| `Tapback` | The user's `count` most-used emoji, or fixed `reactions`, expanding into an `EmojiPicker.Panel`; `selected` marks current reactions |
| `ReactionBar` | Tapback keyboard behavior for a row of your own buttons |
| `Emoji`, `useEmoji` | Renders or resolves a native emoji, shortcode, unified code, custom emoji id, `EmojiSelection`, `EmojiRecord`, or `CustomEmoji`; unknown input renders as text with `data-emoji-missing` |
| `EmojiOverrides` | `artwork={{ [unified]: url \| node }}` replaces artwork for matching emoji in descendants |

## Keyboard

Actions: `move-up`, `move-down`, `move-left`, `move-right` (arrows), `page-up`, `page-down`, `first`, `last` (Home, End), `select` (Enter, Space), `close` (Escape), `focus-search` (/), `toggle-skin-tone` (unbound); defaults are in `DEFAULT_KEYMAP`. `keymap={{ select: ["Enter", "Mod+Enter"] }}` replaces an action's keys; `[]` unbinds it. Escape closes the skin-tone menu, then clears the query, then closes the popover.

`focusModel="input"` (default) keeps focus in the search field and moves `aria-activedescendant`; `"grid"` focuses cells. `pointerModel="follows"` (default) makes the hovered emoji the keyboard position; `"independent"` does not. `event.preventEmojiPickerHandler()` in a part's `onKeyDown` skips the picker's handling. Direction follows React Aria's locale, not CSS `direction`.

## Styling

Parts are unstyled and inject no CSS. Each part has a `data-slot` prefixed `emoji-picker-` (`emoji-picker-search-input`, `emoji-picker-list`, `emoji-picker-emoji`, …) and state attributes: `data-highlighted`, `data-active`, `data-collapsed`, `data-searching`, `data-empty`, `data-disabled`, `data-has-variations`, `data-state`, and React Aria's `data-focused`, `data-focus-visible`, `data-hovered`, `data-pressed`, `data-selected`.

```css
[data-slot="emoji-picker-emoji"][data-highlighted] { background: var(--emoji-picker-selected); }
```

| Variable | Default |
|---|---|
| `--emoji-size`, `--emoji-image-size` | `30px` |
| `--emoji-cell-size` (grid pitch) | size + 10px |
| `--emoji-list-padding`, `--emoji-list-padding-end` | `10px` |
| `--emoji-header-height` | `40px` |
| `--emoji-cell-width`, `--emoji-cell-height`, `--emoji-section-gap`, `--emoji-section-min-width` | Horizontal list |
| `--emoji-font-family`, `--emoji-skin-tone-size` | System emoji fonts, `15px` |

`List` sets `--emoji-picker-content-width` on `Root` to the grid's width. `tokens.css` defines `--emoji-picker-*` tokens with `light-dark()` defaults; `theme.css` maps them to Tailwind utilities (`bg-picker-background`, `rounded-picker`); `shadcn.css` maps them to a shadcn/ui theme.

## Accessibility

Each part follows its WAI-ARIA Authoring Practices pattern. Nothing animates by default.

| Part | Roles |
|---|---|
| Search | `searchbox` with `aria-activedescendant`; polite `status` for the result count |
| List | `listbox` › `group` per section › `option`; `aria-busy` during async search |
| CategoryNav, SkinTone | `tablist`; button with `aria-haspopup` opening a `radiogroup` |
| Variations | Shift+Space or long press opens a `listbox` of six tones |
| Tapback, ReactionBar | `toolbar`, roving tabindex, `aria-pressed` |
| EmojiPopover | Non-modal `dialog`; trigger has `aria-haspopup="dialog"`, `aria-expanded` |
| Typeahead, `Emoji` | `combobox` and `listbox` props; `role="img"` (`decorative` hides it) |

## License

MIT. Third-party notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
