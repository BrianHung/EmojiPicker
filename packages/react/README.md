# @brianhung/emoji-picker-react

Unstyled React components for emoji pickers, reaction rows, and shortcode typeahead, built on [React Aria](https://react-spectrum.adobe.com/react-aria/).

## Installation

```bash
npm i @brianhung/emoji-picker-react
```

To import core helpers (`localeData`, `twemojiUrl`, `withoutTone`, `mergeFrequents`) under pnpm or another strict package manager, also add `@brianhung/emoji-picker-core`.

### shadcn/ui

```bash
npx shadcn@latest add https://emoji.brianhung.me/r/emoji-picker.json
```

```tsx
import { EmojiPickerCard } from "@/components/ui/emoji-picker";

<EmojiPickerCard onSelect={(selection) => insert(selection.emoji)} />
```

| Item | Adds |
|---|---|
| `emoji-picker.json` | `EmojiPickerCard`, `EmojiPickerBody`, `EmojiPickerCell`, `EmojiPickerFooter`, `EmojiTapback`; writes `--emoji-font-family`, `--emoji-picker-background`, `--emoji-picker-radius`, `--emoji-picker-shadow` to your CSS file |
| `emoji-picker-popover.json` | `EmojiPickerPopover` on your `components/ui/popover` (Base UI and Radix bases) |
| `emoji-picker-popover-aria.json` | `EmojiPickerPopover` on your `components/ui/popover` (`--base aria`) |
| `emoji-tiptap.json`, `emoji-lexical.json` | Shortcode menu and a custom emoji node ([Tiptap](https://emoji.brianhung.me/examples/tiptap/), [Lexical](https://emoji.brianhung.me/examples/lexical/)) |
| `emoji-prosemirror.json` | Shortcode menu plugin |

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

Entry points are `"use client"` modules: a Server Component can render flat exports (`EmojiPickerRoot`, `EmojiProvider`) but not namespaced parts or function props.

### Provider

```tsx
import { EmojiProvider } from "@brianhung/emoji-picker-react";

<EmojiProvider customEmojis={pack} filter={(emoji) => emoji.group !== "flags"}>
  <App />
</EmojiProvider>
```

Without a provider, every part and hook shares one default store, and `Emoji` draws native glyphs only.

## Entry points

| Import | Contents |
|---|---|
| `@brianhung/emoji-picker-react` | Components, hooks, and common core types |
| `/floating-ui`, `/react-aria` | `EmojiPopover`, `EmojiSuggestions.Popover`, `pickerInitialFocus`, with the same props. `@floating-ui/react` stays out of bundles that don't import `/floating-ui`. |
| `/tokens.css` | Colors, radius, shadow, and fonts as CSS variables |
| `/theme.css` | Tailwind v4 utilities such as `bg-picker-background`; import after `tokens.css` |
| `/shadcn.css` | Takes colors from your shadcn/ui theme; import after `theme.css` |
| `@brianhung/emoji-picker-core` | Data, search, stores, and every public type, without React ([README](https://github.com/BrianHung/EmojiPicker/tree/main/packages/core#readme)) |

## Anatomy

```
Root
├ Search        Search.Field › Search.Input, Search.Clear (Clear works anywhere in Root)
├ SkinTone      SkinTone.Trigger, SkinTone.Options {(tone) => SkinTone.Option}, SkinTone.Glyph
├ CategoryNav   {(category) => CategoryNav.Tab}
├ Viewport
│ ├ List        {(section) => List.Section}, renderEmptyState
│ │ └ Section   List.SectionTitle, List.Items {(emoji) => List.Cell}, List.SectionActions
│ └ List.Variations {(tone) => List.Variations.Option}   rendered by List unless placed here
├ Preview       {({ emoji }) => …}
├ Reactions     {(emoji) => Reactions.Item}, or Reactions.Items and Reactions.Expand
└ Panel
```

| Every part | Description |
|---|---|
| `children` | Omitted: renders a default |
| `render` | An element or `(props, state) => element` |
| `className`, `style` | A value or a function of state |
| Flat exports | `EmojiPickerRoot`, `EmojiPickerList`, … |
| Types | `EmojiPicker.Root.Props`, `EmojiPicker.Root.State`, `EmojiPicker.Root.Actions`, `EmojiPicker.List.Cell.State`, …; flat aliases `RootProps`, `CellState`, … |

| Hook | Scope |
|---|---|
| `useActiveEmoji`, `useCategoryNavigation` (`CategoryNavigation`), `useCollapsedCategories` (`CollapsedCategories`), `useEmojiPickerActions`, `useSearchState` (`SearchStateValue`) | Inside `Root`; throws outside |
| `useEmojiLabels()` (`EmojiLabels`), `useEmojiStore()`, `useEmojiStatus()`, `useSkinTone()`, `useFrequentEmoji()`, `useEmojiSearch()`, `useEmoji()` | Anywhere |

## API reference

### Root

| Prop | Description |
|---|---|
| `onSelect` | `(selection, details)`. `selection` is an `EmojiSelection` (`emoji`, `unified`, `baseUnified`, `name`, `shortcode`, `shortcodes`, `skinTone`, `isCustom`, `imageUrl`). `details` has `reason`, `event`, `cancel()` (keeps the value and the popover open), and `collapse()` with `reactions`. |
| `query`, `value`, `highlight`, `reactionsOpen`, `collapsedCategories` | Controllable as `x` / `defaultX` / `onXChange(value, details)`. See [Controlled state](#controlled-state). |
| `value`, `highlight` | A unified code. `highlight` also accepts an item key `"<section>:<unified>"` (`"suggested:1f44d"`), passed as `details.key`. `onValueChange` fires whether or not `value` is passed. |
| `categories` | Sections in order, each `{ id, name?, icon?, nav? }`; `nav: false` hides its tab. Ids: `"suggested"` (frequently used), a group such as `"smileys_people"`, `"custom"` (custom emoji without a `group`), `"custom:<group>"`. Unlisted custom sections follow the listed ones; to leave custom emoji out, use the provider's `filter`. |
| `frequent` | Number of frequently used emoji (default 16). `false` hides them. |
| `suggested` | Fixed emoji shown in place of frequently used emoji |
| `emojiVersion` | Hides emoji newer than this Unicode emoji version |
| `columns` | `"fit"` (default) fits the width; a number sets the count per row |
| `reactions` | Shows `Reactions`, which expands into the picker in `Panel`. A list of emoji, or a number of frequently used emoji. See [Reactions](#reactions). |
| `searchResults` | `"ranked"` (one list, default) or `"grouped"` (sections in rank order) |
| `searchLimit` | Maximum search results (default 200) |
| `onKeyDown`, `actionsRef`, `keyboardTarget` | See [Keyboard](#keyboard) |
| `disableVariations` | Disables per-emoji skin-tone variations (long press and Shift+Space) |

### List

| Prop or part | Description |
|---|---|
| `renderEmptyState({ status, query, error, retry })` | `status` is `"loading"`, `"error"`, or `"empty"` |
| `orientation="horizontal"`, `rows`, `searchRows` | Sections side by side; `rows` per section, `searchRows` for results |
| `List.Variations` | The skin-tone popup on a cell (long press, Shift+Space). Rendered by `List`; place it beside `List` in `Viewport` to customize. |
| `List.SectionActions` | Controls over a sticky title, outside the listbox; `toggle` and `toggleProps` collapse the section |

### Provider

| Prop | Description |
|---|---|
| `data` | A URL, `Dataset`, `EmojiDataInput`, or `({ signal }) => Promise<Dataset \| EmojiDataInput>`. Default: core's `data/en.json` from jsDelivr, pinned to the core version. A URL reloads when it changes; an inline loader runs once, and again when `locale` changes. A dataset object without `customEmojis` renders on the first pass, including on the server. |
| `locale`, `labels` | Search folding and segmentation, A–Z order, result-count formatting, text direction, and `EmojiLabels` strings |
| `searchEngine` | An `EmojiSearch`. See [Search](#search). |
| `customEmojis` | A `CustomEmoji`, pack URL, or loader, or an array of them; reloads when the contents change. See [Custom emoji](https://emoji.brianhung.me/examples/custom-emoji/). |
| `filter` | `(record) => boolean`. Removes emoji, custom emoji included, from pickers and search. |
| `skinTone`, `defaultSkinTone`, `onSkinToneChange` | The shared skin tone. `defaultSkinTone` is read once. |
| `frequents`, `defaultFrequents`, `onFrequentsChange` | `Record<unified, { count, lastUsed }>`. `defaultFrequents` (read once) is six common emoji that `remove()` can take out. Entries missing from the current data are skipped, not deleted. |
| `storage` | `{ frequents?, skinTone? }` for uncontrolled values. Default: `localStorageAdapter(key)`, synced across tabs; `null` keeps a value in memory. Read once; a server-rendered page hydrates with the defaults, then reads storage. |
| `frequentsTuning` | `{ halfLifeDays?, max? }`: decay half-life (default 14 days) and history size (default 64). Read once. |
| `renderer`, `imageUrl`, `imageVersion` | `"auto"` (default) uses images only where the system can't draw an emoji. `imageUrl(unified, { renderer })` returns a URL, or `undefined` for native text; the default returns Twemoji when `renderer` is `"image"`. |
| `prepare` | Loads data and builds the search index when the browser is idle (default `true`) |

### Controlled state

| `details` member | Description |
|---|---|
| `reason` | See below. Changes through `actionsRef` report `"imperative-action"`. |
| `event` | The triggering event, when there is one |
| `cancel()`, `isCanceled` | Keeps the state as it is |
| `allowPropagation()`, `isPropagationAllowed` | Lets an `"escape-key"` change of Root `query` or `SkinTone` `open` reach the page, such as an enclosing dialog |

| State | Reasons |
|---|---|
| Root `query` | `"input-change"`, `"clear-press"`, `"escape-key"`, `"imperative-action"`, `"none"` |
| Root `highlight` | `"keyboard"`, `"pointer"`, `"imperative-action"`, `"none"`, with `details.key` |
| Root `value`, `onSelect` | `"item-press"`, `"imperative-action"` (`actions.pick()`). `onValueChange` receives `string \| null`. |
| Root `collapsedCategories` | `"trigger-press"`, `"none"` |
| Root `reactionsOpen` | `"trigger-press"` (Expand), `"item-press"` (`details.collapse()` in `onSelect`), `"escape-key"` (Escape with no query), `"none"` |
| `Reactions` `value` | `"item-press"`, with `details.emoji` and `details.pressed` (whether the press added it) |
| `SkinTone` `open` | `"trigger-press"`, `"outside-press"`, `"escape-key"`, `"item-press"`, `"focus-out"`, `"imperative-action"`, `"none"` |
| `EmojiPopover.Root` `open`, `EmojiSuggestions.Popover` | `"trigger-press"`, `"outside-press"`, `"escape-key"`, `"item-press"`, `"focus-out"`, `"scroll"`, `"imperative-action"`, `"none"` |
| Provider `skinTone` | `"item-press"`, `"none"` |
| Provider `frequents` | `"pick"`, `"remove"`, `"clear"`, with `details.emoji` |

### Keyboard

| Key | Action |
|---|---|
| Arrows, Page Up, Page Down, Home, End | Move the highlight; direction follows React Aria's locale, not CSS `direction` |
| Enter | Pick |
| Shift+Space | Skin-tone variations |
| `/` | Focus search |
| Escape | Closes the skin-tone menu, then clears the query, then closes the popover |

Keyboard and pointer share one highlight. With a search field, focus stays in it (`aria-activedescendant`); without one, focus moves through the cells.

| Prop | Description |
|---|---|
| Event handlers | Run before the part's own handler and receive a `PickerEvent`; `preventEmojiPickerHandler()` skips the part's handler (a `List.Cell` `onClick` that calls it doesn't pick) |
| `actionsRef` | `move(to)`, `pick()`, `highlight(emoji)` (unified code or item key), `focusSearch()`, `clearSearch()`, `close()`, `toggleSkinTone()`. Inside `Root`: `useEmojiPickerActions()`. |
| `keyboardTarget` | An element that keeps focus, such as an editor. Its arrows, Page Up, Page Down, and Enter drive the picker; Tab also picks while it has `aria-expanded="true"`. |

### Styling

Each part has a `data-slot` prefixed `emoji-picker-` (`emoji-picker-search-input`, `emoji-picker-list`, `emoji-picker-emoji`, `emoji-picker-variation`, …). State attributes are present as `""` or absent.

```css
[data-slot="emoji-picker-emoji"][data-highlighted] { background: var(--emoji-picker-selected); }
```

| Attribute | Parts | Description |
|---|---|---|
| `data-highlighted` | Cells, variation options, typeahead options | The highlighted item, from the keyboard or the pointer |
| `data-focused` | Cells | The keyboard position, by DOM focus or `aria-activedescendant` |
| `data-selected` | Cells, skin-tone options, reaction items | The value, the current skin tone, or a selected reaction |
| `data-pressed`, `data-hovered`, `data-focus-visible` | Cells, tabs, buttons | From React Aria. Touch sets no hover. |
| `data-focused` | `List`, tabs, search input | The element holds DOM focus |
| `data-disabled` | `CategoryNav` and its tabs | Search results are showing |
| `data-active` | Category tabs | The section in view |
| `data-open`, `data-closed` | Popups | Whether the popup is open |
| `data-popup-open` | Popup triggers | The popup is open |
| `data-starting-style`, `data-ending-style` | `EmojiPopover.Content`, `EmojiSuggestions.Popover` | Entering or exiting. Nothing animates by default. |
| `data-unified` | Cells, reaction items | The unified code |
| `data-category` | Sections | The category id |
| `data-section` | `List.SectionActions` | The section id |
| `data-row`, `data-column`, `data-index` | Cells | Position across the whole list |
| `data-overridden` | Cells, reaction items, `Emoji` | An `imageUrl` replaces the native glyph |
| `data-has-variations` | Cells | Has skin-tone variations |
| `data-collapsed` | Sections, titles, section actions | The section is collapsed |
| `data-searching` | Root, `Viewport`, `List` | Search results are showing |
| `data-results` | `List` | `"ranked"` or `"grouped"` while results show |
| `data-empty` | `Search`, `Search.Field`, `List` | No query, or nothing to show |
| `data-orientation` | `Viewport`, `List`, `CategoryNav`, skin-tone options | `horizontal` or `vertical` |
| `data-columns` | Root | The `columns` prop |
| `data-reactions-open` | Root | The reaction row is showing |
| `data-side`, `data-align` | `EmojiPopover.Content`, `EmojiSuggestions.Popover` | The resolved placement |
| `data-emoji`, `data-emoji-missing` | `Emoji` | Every rendered `Emoji`; input that resolves to no emoji |

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
| `--emoji-picker-content-width` | Set on `Root` by `List` to the grid's width |

### Accessibility

| Part | Roles |
|---|---|
| Search | `searchbox` with `aria-activedescendant`, and a polite `status` for the result count |
| List | `listbox` › `group` per section › `option`, with `aria-busy` during an async search |
| CategoryNav | `toolbar` of buttons that jump to a section; the one in view has `aria-current` (not tabs: virtualized sections can't be tab panels) |
| SkinTone | Disclosure button (`aria-expanded`, `aria-controls`) for a `toolbar` of `aria-pressed` buttons. Arrows move focus without picking; focus leaving closes it. |
| Variations | `listbox` of six tones. Cells with variations have `aria-keyshortcuts="Shift+Space"`. |
| Reactions, ReactionBar | `toolbar`. Items are toggle buttons with `aria-pressed` when the row has a `value`. Expand is a disclosure for `Panel`; Escape with no query returns to the row. |
| EmojiPopover | `dialog`, non-modal from `/floating-ui` and modal from `/react-aria` by default (`modal` sets it). The trigger has `aria-haspopup="dialog"` and `aria-expanded`. |
| Typeahead | `combobox` and `listbox` props |
| `Emoji` | `role="img"`; `decorative` hides it |

## Guides

### Search

```ts
type EmojiSearch = (query, { records, limit, signal, frequency, locale }) => { unified, score? }[] | Promise<…>; // best first
```

| Export | Description |
|---|---|
| `lexical({ typos, typoThreshold, locale, segmenter, tokenize })` | Default. Word index over shortcodes, names, and tags, with typo correction. |
| `fallback(primary, secondary, { min })` | Appends `secondary`'s hits when `primary` returns fewer than `min` (default 8) |
| `merge(...searches)` | Reciprocal rank fusion |
| `rerank(search, ...rerankers)`, `preferFrequent({ weight })` | Reorders results |
| `progressive(fast, slow)`, `withInterim(promise, hits)` | Shows fast results until slow ones arrive |
| `remote(fetcher)` | Any async source of hits |
| `useEmojiSearch(query, { limit })` | `{ results, pending }` from the provider, outside a picker |

The functions are in `@brianhung/emoji-picker-core/search`. Examples: [Semantic search](https://emoji.brianhung.me/examples/semantic-search/), [third-party engines](https://github.com/BrianHung/EmojiPicker/tree/main/packages/core#search-adapters).

### Popovers

```tsx
import { EmojiPopover } from "@brianhung/emoji-picker-react/floating-ui";

<EmojiPopover.Root>
  <EmojiPopover.Trigger>🙂</EmojiPopover.Trigger>
  <EmojiPopover.Content side="top" align="end">
    <EmojiPicker.Root onSelect={insert}>…</EmojiPicker.Root>
  </EmojiPopover.Content>
</EmojiPopover.Root>
```

| Prop | Description |
|---|---|
| Root `open`, `defaultOpen`, `onOpenChange` | Controlled state; see [Controlled state](#controlled-state) |
| Root `closeOnSelect` | Default `true`. It also closes on Escape and an outside press. |
| Root `modal`, `actionsRef` (`{ close() }`) | |
| Root `onOpenChangeComplete(open)` | Runs once the content's CSS animations and transitions finish; content stays mounted with `data-ending-style` until then |
| Content `anchor` | An element, a virtual element, or a rect function |
| Content `side`, `align` | `top`, `bottom`, `left`, `right`, `inline-start`, `inline-end`; `start`, `center`, `end`. Flips and shifts to fit. |
| Content `sideOffset`, `collisionPadding`, `container` | |
| Content `initialFocus`, `finalFocus` | Focus on open, and on close (default: the trigger) |
| Content, `EmojiSuggestions.Popover` `render`, `className`, `style` | As on parts, as functions of `{ open, side, align }`. Content's default `aria-label` is `labels.picker`. |
| CSS variables | `--transform-origin`, `--available-height`; `/floating-ui` also sets `--available-width` |
| Types | `EmojiPopover.Root.Props`, `EmojiPopover.Trigger.State`, `EmojiPopover.Content.State`, `EmojiSuggestions.Popover.State` |

### Localization

```tsx
import { localeData } from "@brianhung/emoji-picker-core";

<EmojiProvider data={localeData("ja", { shortcodes: "cldr" })} locale="ja" labels={{ searchPlaceholder: "検索", suggested: "よく使う絵文字" }}>
  <App />
</EmojiProvider>
```

| Option | Description |
|---|---|
| `localeData(locale, { shortcodes, baseUrl })` | jsDelivr URL of a `@brianhung/emoji-picker-data` dataset, with localized names, tags, and section names |
| `shortcodes` | `"iamcal"` (default; English in every locale), `"cldr"` (the locale's language), … |
| `locale` | Search folding and segmentation, A–Z order, result-count formatting, text direction |
| `labels` | A partial `EmojiLabels` |

| Label | Default |
|---|---|
| `picker` | `"Emoji picker"` |
| `searchPlaceholder`, `searchLabel`, `searchClear`, `searchResults` | `"Search"`, `"Type to search for an emoji"`, `"Clear"`, `"Search results"` |
| `emojiList`, `categoryNavigation` | `"Emoji"`, `"Category navigation"` |
| `resultCount(count)` | `"No results"`, `"1 result"`, `"# results"`, with `locale`'s plural rules and digits |
| `suggested`, `custom` | `"Frequently used"`, `"Custom"` (section names) |
| `reactions`, `expandReactions` | `"Reactions"`, `"More emoji"` |
| `previewCaption` | `"What's your mood?"` |
| `skinTone`, `skinTones` | `"Skin tone"`, and six names from `"Default skin tone"` to `"Dark skin tone"` |
| `withSkinTone(name, tone)` | `"thumbs up: medium skin tone"` |

### Shortcode typeahead

```tsx
const typeahead = useTextFieldEmojiTypeahead(ref, { onSelect: track });

<textarea ref={ref} />
<EmojiSuggestions.Popover open={typeahead.open} anchor={typeahead.anchor} onOpenChange={(open) => !open && typeahead.dismiss()}>
  <ul {...typeahead.suggestions.getListProps()}>
    {typeahead.suggestions.suggestions.map((s, i) => <li key={s.record.unified} {...typeahead.suggestions.getOptionProps(i)}>{s.record.emoji} :{s.shortcode}:</li>)}
  </ul>
</EmojiSuggestions.Popover>
```

A picker in the menu:

```tsx
<EmojiPicker.Root query={typeahead.query} keyboardTarget={editor} onSelect={typeahead.suggestions.insert}>…</EmojiPicker.Root>
```

| Export | Description |
|---|---|
| `useTextFieldEmojiTypeahead(ref, options)` | For an `<input>` or `<textarea>` |
| `useEmojiTypeahead({ query, anchor, replace }, options, element)` | For any editor; `element` is the editor element, a ref, or a getter. Find the query with `findShortcodeTrigger(textBeforeCaret)`. |
| `EmojiTypeahead` | `query`, `open`, `anchor`, `suggestions`, `dismiss`, `onKeyDown`. The field is a combobox while open. |
| `suggestions.choose(index?)` | Inserts a suggestion and counts it as used |
| `suggestions.insert(selection)` | Writes a selection already counted by a picker |
| `getListProps(props?)`, `getOptionProps(index, props?)` | Merge your props |
| `useEmojiSuggestions({ query, onChoose })` | Suggestions state alone (`suggestions`, `highlightedIndex`, `choose`, `insert`, `onKeyDown`, prop getters) for other fields |
| `useEmojiTypeaheadAdapter(create, deps)` | Wraps a framework-neutral typeahead as an `EmojiTypeahead`. `create(store, { id })` returns `{ suggestions, anchor() }` (from core's `createEmojiSuggestions`) plus pass-through values, such as the Tiptap item's `plugin`. |

| Option | Values |
|---|---|
| `matchBy` | `"shortcode"`, `"search"` |
| `order` | `"relevance"`, `"alphabetical"` |
| `insert` | `"emoji"`, `"shortcode"` |
| `columns`, `limit` | |
| `onSelect(selection)` | Called once an emoji is inserted |

### Reactions

```tsx
<EmojiPicker.Root reactions={5} onSelect={(selection, { collapse }) => (react(selection), collapse?.())}>
  <EmojiPicker.Reactions value={mine} onValueChange={(value, { emoji, pressed }) => (pressed ? add(emoji) : remove(emoji))} />
  <EmojiPicker.Panel>…</EmojiPicker.Panel>
</EmojiPicker.Root>
```

| Export | Description |
|---|---|
| `Reactions` | The row of `Root reactions`, inside a picker. With `value`, `defaultValue`, or `onValueChange`, items are toggle buttons, pressed for listed emoji in any skin tone; a press that adds a reaction also calls `onSelect`. `Reactions.Expand` shows while a `Panel` is rendered. |
| `ReactionBar` | React Aria `Toolbar` for your own buttons, outside a picker. Home and End move to the ends; once focus is inside, hover moves it. |
| `useFrequentEmoji({ limit })` | `{ items, pick, remove, clear }` |
| `Emoji`, `useEmoji` | Renders or resolves a native emoji, shortcode, unified code, custom emoji id, `EmojiSelection`, `EmojiRecord`, or `CustomEmoji`. Unresolved input renders as text with `data-emoji-missing`. |

## Advanced

### Custom parts

| Part | Replacement |
|---|---|
| `Search` | `useSearchState()` for the query and count; pass your input as `keyboardTarget` |
| `SkinTone` | `useSkinTone()` returns `[tone, setTone]` |
| `CategoryNav` | `useCategoryNavigation()` returns `{ categories, activeCategory, jumpToCategory }` (expands a collapsed section first); `DefaultCategoryIcon` draws the built-in icons |
| `Reactions` | `useFrequentEmoji({ limit })`, and `useEmojiPickerActions()` to pick or expand |
| `EmojiPopover` | Any popover (Base UI, Radix, React Aria, shadcn/ui): close it from `onSelect` and give `Search.Input` `autoFocus`, or pass `pickerInitialFocus(content)` as initial focus when there is no search field. Escape clears the query before reaching the popover. [Example](https://emoji.brianhung.me/#custom-popover). |
| `List` | `useEmojiGrid({ rowHeight, headerHeight, columns, scrollToIndex })` (`UseEmojiGridResult`) inside `Root`, and `useEmojiCell(state, item)` per cell, with your own virtualizer. `getGridProps(props?)` and `getHeaderProps(section, props?)` merge your props; render the result's `variations` next to the grid. [Example](https://emoji.brianhung.me/examples/virtualizer/). |

### Self-hosted data

| Dataset | Copy | Pass |
|---|---|---|
| English | `node_modules/@brianhung/emoji-picker-core/data/en.json` to `public/emoji/en.json` | `data="/emoji/en.json"` |
| Other locales and shortcode sets | `node_modules/@brianhung/emoji-picker-data/data/` to `public/emoji/` | `data={localeData("ja", { baseUrl: "/emoji" })}` (resolves to `/emoji/ja/iamcal.json`) |

```ts
import en from "@brianhung/emoji-picker-core/data/en.json?url"; // Vite
```

```bash
npm i -D emojibase-data
npx @brianhung/emoji-picker-core build-data ja --out public/emoji/ja.json
```

`build-data` uses iamcal shortcodes for English, and iamcal and CLDR for other locales.

### Emoji fonts

```css
@import url("https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap");
[data-slot="emoji-picker"] { --emoji-font-family: "Noto Color Emoji"; }
```

| Font | Setup |
|---|---|
| Any color emoji font | `--emoji-font-family`; support detection and image fallback use it too |
| Twemoji | `@brianhung/emoji-picker-twemoji-font`, import its `twemoji.css`, `--emoji-font-family: Twemoji` |
| Custom system stack | Keep `"Emoji Picker Apple"` first: a `local("Apple Color Emoji")` face with fixed metrics that keeps glyphs centered |

### Custom artwork

```tsx
import { twemojiUrl, withoutTone } from "@brianhung/emoji-picker-core";
import type { ImageUrl } from "@brianhung/emoji-picker-react";

const imageUrl: ImageUrl = (unified, { renderer }) => ART[withoutTone(unified)] ?? (renderer === "image" ? twemojiUrl(unified) : undefined);
```

## License

MIT. Third-party notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
