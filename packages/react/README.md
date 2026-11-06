# @brianhung/emoji-picker-react

Unstyled React components for emoji pickers, reaction rows, and shortcode typeahead, built on [React Aria](https://react-spectrum.adobe.com/react-aria/).

## Installation

### shadcn/ui

```bash
npx shadcn@latest add https://emoji.brianhung.me/r/emoji-picker.json
```

```tsx
import { EmojiPickerCard } from "@/components/ui/emoji-picker";

<EmojiPickerCard onSelect={(selection) => insert(selection.emoji)} />
```

The item also exports `EmojiPickerBody`, `EmojiPickerCell`, `EmojiPickerFooter`, and `EmojiTapback`. It writes `--emoji-font-family`, `--emoji-picker-background`, `--emoji-picker-radius`, and `--emoji-picker-shadow` to your CSS file. For `EmojiPickerPopover` in your `components/ui/popover`, add `emoji-picker-popover.json` (Base UI and Radix bases) or `emoji-picker-popover-aria.json` (`--base aria`).

### npm

```bash
npm i @brianhung/emoji-picker-react@alpha
```

The packages are in prerelease and are published under the `alpha` tag.

`@brianhung/emoji-picker-core` installs as a dependency. To import its helpers (`localeData`, `twemojiUrl`, `withoutTone`) under a strict package manager such as pnpm, add it to your own dependencies.

## Usage

```tsx
import { EmojiPicker } from "@brianhung/emoji-picker-react";

<EmojiPicker.Root onSelect={(selection) => insert(selection.emoji)}>
  <EmojiPicker.Search>
    <EmojiPicker.Search.Input />
    <EmojiPicker.SkinTone />
  </EmojiPicker.Search>
  <EmojiPicker.Viewport>
    <EmojiPicker.List
      renderEmptyState={({ status, retry }) =>
        status === "loading" ? "Loading…" : status === "error" ? <button type="button" onClick={retry}>Could not load emoji. Try again</button> : "No emoji found."
      }
    />
  </EmojiPicker.Viewport>
</EmojiPicker.Root>
```

Core includes the English dataset, and `Root` loads it from jsDelivr, pinned to the installed core version. `@brianhung/emoji-picker-data` has every other locale.

The entry points are client modules (`"use client"`). In a React Server Component framework such as the Next.js App Router, render the parts from a `"use client"` file. A Server Component can render flat exports such as `EmojiPickerRoot` and `EmojiProvider`. It cannot render namespaced parts such as `EmojiPicker.Search.Input` or pass function props such as `onSelect`.

### Shared provider

`Root` uses the nearest `EmojiProvider` and creates its own only when there is none. Hoist one provider to share data, locale, custom emoji, skin tone, and frequently used emoji across every picker, reaction row, and typeahead below it.

```tsx
import { EmojiProvider } from "@brianhung/emoji-picker-react";

<EmojiProvider data="/emoji/ja.json" locale="ja" customEmojis={pack}>
  <App />
</EmojiProvider>
```

## Entry points

| Import | Contents |
|---|---|
| `@brianhung/emoji-picker-react` | Components, hooks, and common core types |
| `/floating-ui`, `/react-aria` | `EmojiPopover`, `EmojiSuggestions.Popover`, and `pickerInitialFocus`. `@floating-ui/react` is an optional peer dependency. |
| `/tokens.css`, `/theme.css`, `/shadcn.css` | Design tokens, Tailwind v4 utilities, and the shadcn/ui theme bridge |
| `@brianhung/emoji-picker-core` | Data, search, stores, and every public type, without React ([README](https://github.com/BrianHung/EmojiPicker/tree/main/packages/core#readme)) |

Parts need no CSS. To style with Tailwind, import `tokens.css` (colors, radius, shadow, and fonts) and `theme.css` (utilities such as `bg-picker-background`). In a shadcn/ui project, add `shadcn.css` after them to take the colors from your theme.

## Anatomy

```
Root
├ Search        Search.Input, Search.Clear
├ SkinTone      SkinTone.Trigger, SkinTone.Options {(tone) => SkinTone.Option}, SkinTone.Glyph
├ CategoryNav   {(category) => CategoryNav.Tab}
├ Viewport
│ └ List        {(section) => List.Section}, renderEmptyState
│   └ Section   List.SectionTitle, List.Items {(emoji) => List.Cell}, List.SectionActions
├ Preview       {({ emoji }) => …}
├ Reactions     {(emoji) => Reactions.Item}, or Reactions.Items and Reactions.Expand
└ Panel
```

Each part renders a default when it has no children. Each takes `render` (an element or `(props, state) => element`), `className`, and `style`, as values or functions of state. Parts are also exported individually (`EmojiPickerRoot`, `EmojiPickerList`, …). Types are namespaced on each part, as in Base UI: `EmojiPicker.Root.Props`, `EmojiPicker.Root.State`, `EmojiPicker.Root.Actions`, `EmojiPicker.List.Cell.State`, and so on. Flat aliases (`RootProps`, `CellState`) are also exported.

Hooks inside `Root`: `useActiveEmoji`, `useCategoryNavigation`, `useCollapsedCategories`, `useEmojiPickerActions`, and `useSearchState`. `useEmojiLabels()` returns the provider's localized `EmojiLabels` for parts you render yourself.

## API reference

### Root

| Prop | Description |
|---|---|
| `onSelect` | Receives an `EmojiSelection` (`emoji`, `unified`, `baseUnified`, `name`, `shortcode`, `shortcodes`, `skinTone`, `isCustom`, `imageUrl`) |
| `query`, `value`, `highlight`, `reactionsOpen`, `collapsedCategories` | Controllable as `x` / `defaultX` / `onXChange(value, details)`. See [Controlled state](#controlled-state). |
| `categories` | Sections in order, each with an optional `name`, `icon`, and `nav: false` to hide its tab |
| `frequent` | Number of frequently used emoji (default 16). `false` hides them. |
| `suggested` | Fixed emoji shown in place of frequently used emoji |
| `emojiVersion` | Hides emoji newer than this Unicode emoji version |
| `columns` | `"fit"` (default) fits the width. A number sets exactly that many per row. |
| `reactions` | Shows `Reactions`, a row that expands into the picker in `Panel`. Takes a list of emoji, or a number for that many frequently used emoji. See [Reactions](#reactions). |
| `searchResults` | `"ranked"` (one list, default) or `"grouped"` (sections in rank order) |
| `searchLimit` | Maximum number of search results (default 200) |
| `onKeyDown`, `actionsRef`, `keyboardTarget` | See [Keyboard](#keyboard) |
| `disableVariations` | Disables per-emoji skin-tone variations (long press and Shift+Space) |

`List.SectionActions` renders controls over a sticky title, outside the listbox. Its `toggle` and `toggleProps` collapse the section. `<List orientation="horizontal" rows={5} />` lays sections side by side, and `searchRows` sets the rows for search results. `List renderEmptyState({ status, query, error, retry })` renders while data loads (`"loading"`), after it fails (`"error"`), and when nothing matches (`"empty"`).

### Provider

| Prop | Description |
|---|---|
| `data` | A URL, `Dataset`, `EmojiDataInput`, or `({ signal }) => Promise<Dataset \| EmojiDataInput>`. Default: core's `data/en.json` from jsDelivr, pinned to the core version. |
| `locale`, `labels` | Search folding and segmentation, A–Z order, result-count formatting, text direction, and `EmojiLabels` strings |
| `searchEngine` | An `EmojiSearch`. See [Search](#search). |
| `customEmojis` | A `CustomEmoji`, pack URL, or loader, or an array of them. See [Custom emoji](https://emoji.brianhung.me/examples/custom-emoji/). |
| `filter` | `(record) => boolean`. Removes emoji from pickers and search. |
| `skinTone`, `defaultSkinTone`, `onSkinToneChange` | The shared skin tone |
| `frequents`, `defaultFrequents`, `onFrequentsChange` | Frequently used emoji as `Record<unified, { count, lastUsed }>`. Pickers and `useFrequentEmoji` skip entries that the current data does not include, so the history survives a change of packs. |
| `storage` | `{ frequents?, skinTone? }`: where uncontrolled frequently used emoji and skin tone persist. Default: `localStorageAdapter(key)`, synced across tabs. `null` for either key keeps that value in memory. |
| `frequentsTuning` | `{ halfLifeDays?, max? }`: how fast a use fades (default 14 days) and how many emoji the history keeps (default 64) |
| `renderer`, `imageUrl`, `imageVersion` | `"auto"` (default) uses images only where the system cannot draw an emoji. `imageUrl(unified, { renderer })` returns an image URL, or `undefined` for native text. The default returns Twemoji when `renderer` is `"image"`. |

Changing a prop updates the provider in place, except `storage` and `frequentsTuning`, which are read once. Pass functions and objects with stable identity. A dataset object without `customEmojis` renders on the first pass, including on the server.

### Controlled state

Every controllable state takes `x`, `defaultX`, and `onXChange(value, details)`. `details` has `reason` and, when there is one, the `event`. `cancel()` keeps the state as it is, and `isCanceled` reports whether it was called. `allowPropagation()` and `isPropagationAllowed` control whether the key event reaches the page. Changes made through `actionsRef` report `"imperative-action"`.

| State | Reasons |
|---|---|
| Root `query` | `"input-change"`, `"escape-key"`, `"imperative-action"`, `"none"` |
| Root `highlight` | `"keyboard"`, `"pointer"`, `"imperative-action"`, `"none"` |
| Root `value` | `"item-press"`. `onValueChange` receives `string \| null`, as in Base UI's Select. |
| Root `collapsedCategories` | `"trigger-press"`, `"none"` |
| Root `reactionsOpen` | `"trigger-press"` (Expand), `"item-press"` (`details.collapse()` in `onSelect`), `"none"` |
| `SkinTone` `open` | `"trigger-press"`, `"outside-press"`, `"escape-key"`, `"item-press"`, `"imperative-action"`, `"none"` |
| `EmojiPopover.Root` `open`, `EmojiSuggestions.Popover` | `"trigger-press"`, `"outside-press"`, `"escape-key"`, `"item-press"`, `"focus-out"`, `"scroll"`, `"imperative-action"`, `"none"` |
| Provider `skinTone` | `"item-press"`, `"none"` |
| Provider `frequents` | `"pick"`, `"remove"`, `"clear"`, with `details.emoji` |

`allowPropagation()` lets an `"escape-key"` change of Root `query` or `SkinTone` `open` reach the page, such as a dialog around the picker. It has no effect on other changes.

### Keyboard

Parts handle their keys with React Aria: the arrow keys, Page Up, Page Down, Home, End, and Enter in the grid, Shift+Space for skin tones, and `/` to search. Escape closes the skin-tone menu, then clears the query, then closes the popover. Keyboard and pointer move one highlight. With a search field, focus stays in the field (`aria-activedescendant`). Without one, focus moves through the cells. Direction follows React Aria's locale, not CSS `direction`.

| Prop | Description |
|---|---|
| `onKeyDown` (Root, `Search`, `Search.Input`, `Viewport`, `List`, `CategoryNav`) | Runs before the picker's handler. `event.preventEmojiPickerHandler()` skips the picker's handler. |
| `actionsRef` | `move(to)`, `pick()`, `highlight(emoji)`, `focusSearch()`, `clearSearch()`, `close()`, and `toggleSkinTone()`. Inside `Root`, use `useEmojiPickerActions()`. |
| `keyboardTarget` | An element that keeps focus, such as an editor. Its arrow keys, Page Up, Page Down, and Enter drive the picker. Tab also picks while the element is an expanded combobox (`aria-expanded="true"`). |

### Styling

Each part has a `data-slot` prefixed `emoji-picker-`, such as `emoji-picker-search-input`, `emoji-picker-list`, and `emoji-picker-emoji`. State is exposed as data attributes.

| Attribute | Parts | Description |
|---|---|---|
| `data-highlighted` | Cells | The highlighted cell while focus stays in a search field or keyboard target |
| `data-selected` | Cells, skin-tone options, reaction items | The value, the current skin tone, or a selected reaction |
| `data-pressed`, `data-hovered`, `data-focus-visible` | Cells, tabs, buttons | From React Aria. Touch input sets no hover. |
| `data-focused` | `List`, tabs, search field | The element holds DOM focus |
| `data-disabled` | `CategoryNav` and its tabs | Search results are showing |
| `data-active` | Category tabs | The tab for the section in view, as on Base UI's `Tabs.Tab` |
| `data-open`, `data-closed` | Popups | Whether the popup is open |
| `data-popup-open` | Popup triggers | The popup is open |
| `data-starting-style`, `data-ending-style` | `EmojiPopover.Content` | The content is entering or exiting |
| `data-unified` | Cells, reaction items | The unified code |
| `data-category` | Sections | The section's category id |
| `data-section` | `List.SectionActions` | The section id |
| `data-row`, `data-column`, `data-index` | Cells | Row, column, and index across the whole list |
| `data-overridden` | Cells, reaction items, `Emoji` | An `imageUrl` replaces the native glyph |
| `data-has-variations` | Cells | The emoji has skin-tone variations |
| `data-collapsed` | Sections, titles, section actions | The section is collapsed |
| `data-searching` | Root, `Viewport`, `List` | Search results are showing |
| `data-results` | `List` | `"ranked"` or `"grouped"` while search results show |
| `data-empty` | `Search`, `List` | No query, or nothing to show |
| `data-orientation` | `Viewport`, `List`, `CategoryNav`, skin-tone options | `horizontal` or `vertical` |
| `data-columns` | Root | The `columns` prop |
| `data-reactions-open` | Root | The reaction row is showing |
| `data-side`, `data-align` | `EmojiPopover.Content` | The resolved placement |
| `data-emoji`, `data-emoji-missing` | `Emoji` | Every rendered `Emoji`, and input that resolves to no emoji |

```css
[data-slot="emoji-picker-emoji"][data-highlighted] { background: var(--emoji-picker-selected); }
```

| Variable | Default |
|---|---|
| `--emoji-size` | `30px` |
| `--emoji-image-size` | `--emoji-size` |
| `--emoji-cell-size` (grid pitch) | `--emoji-size` + 10px |
| `--emoji-cell-width`, `--emoji-cell-height` | `--emoji-cell-size` |
| `--emoji-list-padding` | `10px` |
| `--emoji-list-padding-end`, `--emoji-section-gap` (horizontal list) | `--emoji-list-padding` |
| `--emoji-section-min-width` (horizontal list) | `0px` |
| `--emoji-header-height` | `40px` |
| `--emoji-skin-tone-size` | `15px` |
| `--emoji-font-family` | System emoji fonts (from `tokens.css`) |

`List` sets `--emoji-picker-content-width` on `Root` to the grid's width.

### Accessibility

Each part follows its WAI-ARIA Authoring Practices pattern. Nothing animates by default.

| Part | Roles |
|---|---|
| Search | `searchbox` with `aria-activedescendant`, and a polite `status` for the result count |
| List | `listbox` › `group` per section › `option`, with `aria-busy` during an async search |
| CategoryNav | `tablist` of `tab`s |
| SkinTone | A button with `aria-haspopup` and `aria-expanded` that opens a `radiogroup` |
| Variations | Shift+Space or a long press opens a `listbox` of six tones |
| Reactions, ReactionBar | `toolbar`. Items are toggle buttons with `aria-pressed` when `selected` is set. |
| EmojiPopover | `dialog`, non-modal from `/floating-ui` and modal from `/react-aria`. The trigger has `aria-haspopup="dialog"` and `aria-expanded`. |
| Typeahead | `combobox` and `listbox` props |
| `Emoji` | `role="img"`. `decorative` hides it. |

## Guides

### Search

A search is `(query, { records, limit, signal, frequency, locale }) => { unified, score? }[] | Promise<…>`, best first. Compose engines from `@brianhung/emoji-picker-core/search`:

| Function | Description |
|---|---|
| `lexical({ typos, typoThreshold, locale, segmenter, tokenize })` | Default. A word index over shortcodes, names, and tags, with typo correction. |
| `fallback(primary, secondary, { min })` | Appends `secondary`'s hits when `primary` returns fewer than `min` (default 8) |
| `merge(...searches)` | Reciprocal rank fusion |
| `rerank(search, ...rerankers)`, `preferFrequent({ weight })` | Reorders results |
| `progressive(fast, slow)`, `withInterim(promise, hits)` | Shows fast results until slow ones arrive |
| `remote(fetcher)` | Any async source of hits |

`useEmojiSearch(query, { limit })` returns `{ results, pending }` from the provider, outside a picker. For embedding search, see [Semantic search](https://emoji.brianhung.me/examples/semantic-search/).

### Popovers

`EmojiPopover` (from `/floating-ui` or `/react-aria`) positions, flips, and shifts its content. It closes on Escape, an outside press, or a pick (`closeOnSelect={false}` keeps it open), and restores focus to the trigger or `finalFocus`. `anchor` accepts an element, a virtual element, or a rect function.

```tsx
import { EmojiPopover } from "@brianhung/emoji-picker-react/floating-ui";

<EmojiPopover.Root>
  <EmojiPopover.Trigger>🙂</EmojiPopover.Trigger>
  <EmojiPopover.Content side="top" align="end">
    <EmojiPicker.Root onSelect={insert}>…</EmojiPicker.Root>
  </EmojiPopover.Content>
</EmojiPopover.Root>
```

`EmojiPopover.Content` takes `render`, `className`, and `style` like the parts. Its types are namespaced (`EmojiPopover.Root.Props`, `EmojiPopover.Trigger.State`, `EmojiPopover.Content.State`). Content exposes `data-open`, `data-closed`, `data-starting-style`, `data-ending-style`, `data-side`, `data-align`, `--transform-origin`, and `--available-height` for CSS transitions. `/floating-ui` also sets `--available-width`.

### Typeahead

`useTextFieldEmojiTypeahead(ref, options)` adds `:shortcode` suggestions to an `<input>` or `<textarea>`. `useEmojiTypeahead({ query, anchor, replace }, options, element)` does the same for any editor, with `findShortcodeTrigger(textBeforeCaret)` to find the query. Both return an `EmojiTypeahead` (`query`, `open`, `anchor`, `suggestions`, `dismiss`, `onKeyDown`) and make the field a combobox while it is open.

```tsx
const typeahead = useTextFieldEmojiTypeahead(ref, { onSelect: track });

<textarea ref={ref} />
<EmojiSuggestions.Popover open={typeahead.open} anchor={typeahead.anchor} onOpenChange={(open) => !open && typeahead.dismiss()}>
  <ul {...typeahead.suggestions.getListProps()}>
    {typeahead.suggestions.suggestions.map((s, i) => <li key={s.record.unified} {...typeahead.suggestions.getOptionProps(i)}>{s.record.emoji} :{s.shortcode}:</li>)}
  </ul>
</EmojiSuggestions.Popover>
```

The options are `matchBy` (`"shortcode"`, `"search"`), `order` (`"relevance"`, `"alphabetical"`), `columns`, `limit`, `insert` (`"emoji"`, `"shortcode"`), and `onSelect(selection)`, which is called once an emoji is inserted. `suggestions.choose(index?)` inserts a suggestion and counts it as used. `suggestions.insert(selection)` only writes a selection into the field, for a picker in the menu that already counted it:

```tsx
<EmojiPicker.Root query={typeahead.query} keyboardTarget={editor} onSelect={typeahead.suggestions.insert}>…</EmojiPicker.Root>
```

Tiptap, Lexical, and ProseMirror adapters are registry items (`emoji-tiptap.json`, `emoji-lexical.json`, `emoji-prosemirror.json`). See the [Tiptap](https://emoji.brianhung.me/examples/tiptap/) and [Lexical](https://emoji.brianhung.me/examples/lexical/) examples.

### Reactions

```tsx
<EmojiPicker.Root reactions={5} onSelect={(selection, { collapse }) => (react(selection), collapse?.())}>
  <EmojiPicker.Reactions selected={mine} />
  <EmojiPicker.Panel>…</EmojiPicker.Panel>
</EmojiPicker.Root>
```

`Reactions` is the reaction row inside a picker, which expands into the full picker. `ReactionBar` is a standalone row of your own reaction buttons, outside any picker.

| Export | Description |
|---|---|
| `Reactions` | The row of `Root reactions`. With `selected`, the items are toggle buttons, pressed for the listed emoji in any skin tone. `Reactions.Expand` shows while a `Panel` is rendered. |
| `ReactionBar` | React Aria's `Toolbar` for a row of your own buttons. Home and End move to the ends. Once focus is inside, hover moves it. |
| `useFrequentEmoji({ limit })` | `{ items, record, remove, clear }` for the provider's frequently used emoji |
| `Emoji`, `useEmoji` | Renders or resolves a native emoji, shortcode, unified code, custom emoji id, `EmojiSelection`, `EmojiRecord`, or `CustomEmoji`. Input that resolves to no emoji renders as text with `data-emoji-missing`. |

## Advanced

### Custom parts

To replace a part with your own component, use its hook:

| Part | Hook |
|---|---|
| `Search` | `useSearchState()` for the query and count. An input you render drives the grid as `keyboardTarget`. |
| `SkinTone` | `useSkinTone()` returns `[tone, setTone]` |
| `CategoryNav` | `useCategoryNavigation()` returns `{ categories, activeCategory, jumpToCategory }`. `jumpToCategory` expands a collapsed section first. `DefaultCategoryIcon` draws the built-in icons. |
| `Reactions` | `useFrequentEmoji({ limit })` for the items, and `useEmojiPickerActions()` to pick or expand |
| `EmojiPopover` | Any popover, with `pickerInitialFocus` as its initial focus |
| `List` | `useEmojiGrid` and `useEmojiCell` with your own virtualizer. See [Custom virtualizer](#custom-virtualizer). |

### Self-hosted data

Copy `node_modules/@brianhung/emoji-picker-core/data/en.json` to a path you serve and pass its URL: `<EmojiProvider data="/emoji/en.json">`. For other locales, copy `@brianhung/emoji-picker-data`'s `data/` and use `localeData("ja", { baseUrl: "/emoji" })`, or build a dataset with `npx @brianhung/emoji-picker-core build-data ja --out public/emoji/ja.json`, which requires `emojibase-data`. By default, English uses iamcal shortcodes and other locales use iamcal and CLDR.

### Emoji fonts

Native rendering draws text in `--emoji-font-family`, so any color emoji font works, including one you ship with your own emoji. Support detection and image fallback use that font. For example, to use Noto Color Emoji from Google Fonts:

```css
@import url("https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap");
[data-slot="emoji-picker"] { --emoji-font-family: "Noto Color Emoji"; }
```

To use Twemoji as a font, import `@brianhung/emoji-picker-twemoji-font/twemoji.css` and set `--emoji-font-family: Twemoji`.

### Custom artwork

To use images instead of a font, pass `imageUrl`. It replaces particular emoji, or all of them, under any renderer:

```tsx
const imageUrl: ImageUrl = (unified, { renderer }) => ART[withoutTone(unified)] ?? (renderer === "image" ? twemojiUrl(unified) : undefined);
```

### Custom popover

Put the picker in any popover (Base UI, Radix, or shadcn/ui), close it from `onSelect`, and give `Search.Input` `autoFocus`. A picker without a search field takes `pickerInitialFocus(content)` (from either popover subpath) as the popover's initial focus. Escape clears the query before it reaches the popover.

### Custom virtualizer

Call `useEmojiGrid({ rowHeight, headerHeight, columns, scrollToIndex })` inside `Root` in place of `List`, and `useEmojiCell(state, item)` for each cell. Keyboard, highlight, and variations work as in `List`. See [Custom virtualizer](https://emoji.brianhung.me/examples/virtualizer/).

### Suggestions without an editor

`useEmojiSuggestions({ query, onChoose })` is the suggestions state alone (`suggestions`, `highlightedIndex`, `choose`, `insert`, `onKeyDown`, and prop getters), for a field that the typeahead hooks do not cover.

### Typeahead adapters

`useEmojiTypeaheadAdapter(create, deps)` renders a framework-neutral typeahead as an `EmojiTypeahead`. `create(store, { id })` returns `{ suggestions, anchor() }`, built on core's `createEmojiSuggestions`, plus any other values to pass through. The Tiptap item returns its ProseMirror `plugin` this way.

### Search adapters

For third-party search engines, see the [core README](https://github.com/BrianHung/EmojiPicker/tree/main/packages/core#search-adapters).

## License

MIT. Third-party notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
