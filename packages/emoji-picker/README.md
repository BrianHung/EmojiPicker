# @brianhung/emoji-picker

Unstyled React components for emoji pickers, tapbacks, and shortcode autocomplete.

## Overview

The library builds on [React Aria Components](https://react-spectrum.adobe.com/react-aria/) (a virtualized `ListBox` grid, `Autocomplete`, `SearchField`, `Tabs`, `Toolbar`) and [Floating UI](https://floating-ui.com), and adds:

- Tapbacks: the user's most-used emoji, with a button that expands into the full picker.
- Slack shortcodes (`:thumbsup:`, `:+1::skin-tone-4:`) in search, in selections, and as `:thu` autocomplete.
- Native emoji on Apple and Android, and [Twemoji](https://github.com/jdecked/twemoji) where the system can't draw flags.
- Custom emoji, artwork overrides, collapsible sections, and a horizontal list.
- Replaceable search, from a built-in word index to embeddings.

One `EmojiProvider` holds the data, search index, frequently used emoji, and skin tone for every picker below it.

## Getting started

```bash
npm install @brianhung/emoji-picker
```

```tsx
import { EmojiPicker, EmojiProvider, Tapback } from "@brianhung/emoji-picker";
import en from "@brianhung/emoji-picker/data/en.json?url"; // Vite; other bundlers have their own asset imports

<EmojiProvider data={en}>
  <EmojiPicker.Root onSelect={(selection) => insert(selection.emoji)} className="h-[380px] w-[352px]">
    <EmojiPicker.Search>
      <EmojiPicker.SkinTone />
    </EmojiPicker.Search>
    <EmojiPicker.Viewport>
      <EmojiPicker.List />
      <EmojiPicker.Empty>No emoji found.</EmojiPicker.Empty>
    </EmojiPicker.Viewport>
  </EmojiPicker.Root>

  <Tapback onSelect={(selection) => react(message.id, selection.unified)} />
</EmojiProvider>
```

Pass the dataset as a URL so it loads as a separate, cacheable asset. `data` also takes a dataset object or a loader, `({ signal }) => Promise<Dataset>`.

To copy a styled shadcn/ui version into your project:

```bash
npx shadcn@latest add https://emoji.brianhung.me/r/emoji-picker.json
```

It adds `components/ui/emoji-picker.tsx` with `EmojiPickerCard`, `EmojiPickerPopover`, `EmojiTapback`, `EmojiPickerBody`, and `EmojiPickerFooter`.

## Entry points

| Import | Contents |
|---|---|
| `@brianhung/emoji-picker` | Components and hooks |
| `@brianhung/emoji-picker/core` | `createEmojiStore`, `resolveEmoji`, frequency storage, Twemoji helpers, tokenizers, and `EmojiLabels`. No React. |
| `@brianhung/emoji-picker/search` | Building blocks for the provider's `search` |
| `@brianhung/emoji-picker/data/en.json` | The English dataset |
| `@brianhung/emoji-picker/tokens.css`, `theme.css`, `shadcn.css` | Color tokens, Tailwind utilities, and the shadcn/ui bridge |

## Pickers

`EmojiPicker` is a set of parts: `Root`, `Search`, `SearchInput`, `CategoryNav`, `Viewport`, `List`, `Preview`, `SkinTone`, `Empty`, `Loading`, `LoadError`, `Reactions`, and `Panel`. Hooks inside a `Root`: `useActiveEmoji`, `useCategoryNavigation`, `useCollapsedCategories`, `useSearchState`, and `useSearchActions`.

`Root` takes `onSelect`, `categories` (order, names, icons, and `nav: false`), `frequent`, `suggested`, `columns` (with `fitColumns={false}` to keep them when the width is a little short), `emojiVersion`, `searchResults`, `keymap`, `focusModel`, `pointer`, and `artwork`, among others. `onSelect` receives an `EmojiSelection`: `emoji`, `unified`, `baseUnified`, `name`, `shortcode`, `skinTone`, `isCustom`, and `imageUrl`.

Search results replace the category list while a query is active. `searchResults="ranked"` shows one list, best match first; `"grouped"` shows category sections in rank order.

### Collapsible sections

A collapsed section keeps its header and hides its rows. Control collapse with `collapsedCategories` and `onCollapsedCategoriesChange`, or set `defaultCollapsedCategories`.

A section title is text inside the listbox (`CategoryHeader` customizes it and receives `category.collapsed`). Controls for a title, such as a collapse chevron or a "Customize" link, go in `components.HeaderActions`: they render in a layer over the list, outside the listbox, pinned with the title as it sticks.

```tsx
function Toggle({ section, toggle, toggleProps }: HeaderActionsProps) {
  return <button type="button" {...toggleProps} aria-label={section.name} onClick={toggle} className="absolute inset-0" />;
}

<EmojiPicker.List components={{ HeaderActions: Toggle }} />
```

`toggleProps` carries `aria-expanded` and `aria-controls` (the section's group). Search results ignore collapse.

### Horizontal list

`<EmojiPicker.List orientation="horizontal" rows={5} />` lays sections side by side, as the iOS emoji keyboard does. Each section fills `rows` rows column by column, and the Viewport scrolls sideways. `searchRows` sets the rows for search results. Only columns near the viewport render. Long-press skin-tone variations aren't available in this layout.

## Tapbacks

`Tapback` shows the user's `count` most-used emoji (iOS defaults until there's history), or fixed `reactions`. Its children become the expanded picker. `selected` makes the user's current reactions toggles with `aria-pressed`, in any skin tone. For a row of your own buttons, `ReactionBar` gives the same keyboard: one tab stop, arrows, Home and End, and focus that follows the pointer within the row.

## Popovers

`EmojiPopover` positions its content next to the trigger with Floating UI (flip, shift, size; `--available-width` and `--available-height` on the content), closes on Escape, an outside click, or a pick, and returns focus to the trigger. `closeOnSelect={false}` keeps it open after a pick. `anchor` positions it against another element, a virtual element, or a function that returns a rect, such as an editor's caret.

```tsx
<EmojiPopover.Root>
  <EmojiPopover.Trigger asChild>
    <Button variant="outline">🙂</Button>
  </EmojiPopover.Trigger>
  <EmojiPopover.Content side="top" align="end">
    <EmojiPicker.Root onSelect={insert}>…</EmojiPicker.Root>
  </EmojiPopover.Content>
</EmojiPopover.Root>
```

Nothing animates by default. Content carries `data-starting-style` on its first frame, `data-ending-style` while closing (it unmounts when its transitions finish, and is `inert` meanwhile), `data-state`, `data-side`, `data-align`, and `--transform-origin`. Use CSS transitions so that reopening mid-exit reverses in place.

### With your own popover

A picker drops into any popover. Give it `autoFocusSearch`, and let the popover focus `pickerInitialFocus(content)` on open: the search field, else the grid's current emoji. Close it from `onSelect`.

```tsx
import { EmojiPicker, pickerInitialFocus } from "@brianhung/emoji-picker";
import { Popover } from "@base-ui-components/react/popover"; // or shadcn/ui's Popover (Radix)

// Base UI
<Popover.Root open={open} onOpenChange={setOpen}>
  <Popover.Trigger>🙂</Popover.Trigger>
  <Popover.Portal>
    <Popover.Positioner sideOffset={8}>
      <Popover.Popup ref={popup} initialFocus={() => pickerInitialFocus(popup.current)}>
        <EmojiPicker.Root autoFocusSearch onSelect={(e) => (insert(e), setOpen(false))}>…</EmojiPicker.Root>
      </Popover.Popup>
    </Popover.Positioner>
  </Popover.Portal>
</Popover.Root>

// Radix / shadcn/ui
<PopoverContent onOpenAutoFocus={(e) => { e.preventDefault(); pickerInitialFocus(e.currentTarget as HTMLElement)?.focus(); }}>
  <EmojiPicker.Root autoFocusSearch onSelect={(e) => (insert(e), setOpen(false))}>…</EmojiPicker.Root>
</PopoverContent>
```

Escape clears the query first, and the picker keeps that key; with no query it reaches the popover, which closes.

## Autocomplete

`useShortcodeAutocomplete({ value, caret })` adds `:tada` → 🎉 to a text input. It owns matching, the highlight, keys, and ARIA; you render the list. In a rich-text editor, let the editor find the trigger and pass the query to `useEmojiSuggestions`:

```tsx
const menu = useEmojiSuggestions({
  query,
  onChoose: (suggestion) => editor.chain().focus().deleteRange(range).insertContent(menu.textFor(suggestion) + " ").run(),
});
// In the editor's suggestion plugin: onKeyDown: ({ event }) => menu.onKeyDown(event)
```

Both hooks take `matchBy` (`"shortcode"` or `"search"`), `order` (`"relevance"` or `"alphabetical"`), `columns`, and `limit`. The demo has complete [Tiptap](../../apps/demo/src/components/tiptap) and [Lexical](../../apps/demo/src/components/lexical) integrations.

## Rendering emoji

`<Emoji emoji={…} />` draws one emoji the way the pickers do. It accepts a native emoji, a shortcode with or without colons, a unified code, a custom emoji id, an `EmojiSelection`, an `EmojiRecord`, or a `CustomEmoji`. Unknown input renders as text with `data-emoji-missing`. `useEmoji(input)` returns the resolved emoji, and `resolveEmoji(store, input)` does the same without React. The `unified` prop is a deprecated alias of `emoji`.

### Artwork overrides

`EmojiOverrides` draws particular emoji with your own art everywhere inside it: `<Emoji>`, picker cells, search results, and tapbacks. The emoji keep their identity for selection, search, and frequents. Keys are unified codes; a base code covers every skin tone. `Root` and `Tapback` take the same map as `artwork`.

```tsx
<EmojiOverrides artwork={{ "2764-fe0f": "/tapback/heart.svg", "2753": <QuestionMark /> }}>
  <MessageReactions />
</EmojiOverrides>
```

## Custom emoji

`customEmojis` takes a `CustomEmoji`, an array, a pack's JSON URL, a loader, or an array that mixes them. Packs load in parallel with the data. A pack that fails is left out and reported by `store.packErrors()`.

| `CustomEmoji` field | Description |
|---|---|
| `id`, `name`, `imageUrl` | Required |
| `shortcodes`, `tags` | Search terms. The words of `id` and shortcodes also match. |
| `group` | A section of its own: `categories={[{ id: "custom:<group>" }]}` |
| `width`, `height` | Intrinsic size; non-square images fit inside the cell |
| `animated`, `stillUrl` | Grids show the still frame and animate only the hovered or highlighted emoji, never with reduced motion |
| `base` | A standard emoji whose name and tags this one also matches |

Only visible rows render, so only their images load.

## Search

A search is a function, `(query, context) => hits | Promise<hits>`. Set it with the provider's `search`; the picker, `useEmojiSearch`, and `useEmojiSearchState` call it.

```tsx
import Fuse from "fuse.js";
import { fallback, fuse, lexical, preferFrequent, progressive, remote, rerank } from "@brianhung/emoji-picker/search";

const typoTolerant = fallback(lexical(), fuse(Fuse));
const personal = rerank(lexical(), preferFrequent());
const semantic = progressive(lexical(), remote((query, { signal }) => fetchEmoji(query, signal)));

<EmojiProvider data={en} search={semantic}>…</EmojiProvider>
```

`context` provides `records`, `limit`, `signal` (aborted when the query changes), and `frequency(unified)`. Return `{ unified, score? }[]`, best first.

| Function | Description |
|---|---|
| `lexical({ typos, typoThreshold, locale, segmenter, tokenize })` | The default. A sorted word index over shortcodes, names, and tags, with typo correction. |
| `fallback(primary, secondary, { min })` | Uses `secondary` when `primary` finds fewer than `min` results |
| `merge(...searches)` | Reciprocal rank fusion |
| `rerank(search, ...rerankers)`, `preferFrequent({ weight })` | Reorders results |
| `progressive(fast, slow)`, `withInterim(promise, hits)` | Shows fast results until slow ones arrive |
| `remote(fetcher)` | Any async source of unified codes or hits |
| `fuse(Fuse, options)` | Adapts Fuse.js, passed in so it stays optional |

## Keyboard

Keys trigger actions, and `Root`'s `keymap` binds them. Every layout gives an action the same meaning.

| Action | Default keys | Description |
|---|---|---|
| `move-up`, `move-down` | ArrowUp, ArrowDown | A row. Down from the search field enters the grid. |
| `move-left`, `move-right` | ArrowLeft, ArrowRight | A cell, in screen direction. In the search field, only with the caret at the end. |
| `page-up`, `page-down` | PageUp, PageDown | The rows (or columns) that fit in the Viewport |
| `first`, `last` | Home, Ctrl+Home, End, Ctrl+End | The first and last emoji. In a search field with a query, Home and End move the caret. |
| `select` | Enter, Space | Picks the focused or highlighted emoji (Space types in the search field) |
| `close` | Escape | Closes the skin-tone menu, clears the query, ends the highlight, then closes the surrounding popover |
| `focus-search` | / | Focuses the search field |
| `toggle-skin-tone` | None | Opens or closes `SkinTone` |

```tsx
<EmojiPicker.Root keymap={{ "move-down": ["ArrowDown", "j"], select: ["Enter", "Mod+Enter"] }}>…</EmojiPicker.Root>
```

A binding replaces the action's defaults, and `[]` unbinds it. `Mod` is ⌘ on Apple platforms and Ctrl elsewhere. Printable keys still type in the search field.

`focusModel="input"` (the default) keeps focus in the search field and moves a highlight (`aria-activedescendant`); `"grid"` moves focus into the cells. `pointer="follows"` (the default) makes the hovered emoji the keyboard position: the next arrow continues from it, and hover never takes focus from outside the picker; `"independent"` leaves hover as a style. Without a search field, focus is on the cells either way. The grid, the category tabs and a tapback's reactions are one tab stop each (roving tabindex). After a pick, focus and the highlight stay where they were.

A part's `onKeyDown` runs before the picker handles a key, innermost first. Call `event.preventEmojiPickerHandler()` to keep the picker (and React Aria) from handling it. A key the picker handles stops at `Root`, as React Aria's handled keys do.

## Accessibility

Each part follows its WAI-ARIA Authoring Practices pattern. `npm run test:a11y` runs axe-core and the checks below in Chrome.

| Part | Roles and states |
|---|---|
| Search field | `searchbox` (React Aria `Autocomplete`) with `aria-controls` and `aria-activedescendant` |
| Search status | A polite `status` live region: “24 results”, “No results” |
| Lists and results | `listbox` › `group` (each section, named by its title) › `option`, named by the emoji and its skin tone, with `aria-posinset`/`aria-setsize` within its section; `aria-busy` during an async search; `aria-selected` only in a value picker (`List value`) |
| CategoryNav | `tablist` of `tab`s with `aria-selected` |
| SkinTone | A button with `aria-haspopup` and `aria-expanded` that opens a `radiogroup` |
| Tapback, ReactionBar | A `toolbar` with one tab stop (roving tabindex); `aria-pressed` on the user's reactions |
| EmojiPopover | Trigger with `aria-haspopup="dialog"`, `aria-expanded`, and `aria-controls`; content is a labelled, non-modal `dialog` |
| Autocomplete hooks | `combobox` and `listbox` props from `getInputProps`, `getListProps`, and `getOptionProps` |
| `Emoji` | `role="img"` named by the emoji; `decorative` hides it |

The library animates nothing itself and honors `prefers-reduced-motion`.

## Styling

Parts are unstyled. Every part and cell has a stable `data-slot`, such as `emoji-picker`, `search-input`, `category-tab`, `list`, `category-header`, and `emoji`. State appears as `data-highlighted` (the search field's highlight), `data-active`, `data-collapsed`, `data-has-variations`, and `data-state`, plus React Aria's `data-focused`, `data-focus-visible`, `data-hovered`, `data-pressed`, and `data-selected`. Repeated elements take class props: `cellClassName` and `headerClassName` on `List`, `tabClassName` on `CategoryNav`, and `buttonClassName` on `SkinTone`.

```css
[data-slot="emoji"][data-highlighted] { background: var(--emoji-picker-selected); }
```

Set sizes with CSS variables on `Root` or an ancestor:

| Variable | Default | Description |
|---|---|---|
| `--emoji-size` | `30px` | Glyph size |
| `--emoji-cell-size` | size + 10px | Grid pitch |
| `--emoji-image-size` | `--emoji-size` | Image emoji inside a cell |
| `--emoji-list-padding` | `10px` | Inline padding of the grid |
| `--emoji-list-padding-end` | `--emoji-list-padding` | The grid's end padding without `columns` (may be negative) |
| `--emoji-header-height` | `40px` | Section title height |
| `--emoji-cell-width`, `--emoji-cell-height` | `--emoji-cell-size` | Horizontal list pitch |
| `--emoji-section-gap`, `--emoji-section-min-width` | `--emoji-list-padding`, `0px` | Horizontal list sections |
| `--emoji-font-family` | System emoji fonts | Font for native emoji |
| `--emoji-skin-tone-size` | `15px` | Default skin-tone swatch |

`tokens.css` defines `--emoji-picker-*` color and shape tokens with `light-dark()` defaults. `theme.css` exposes them as Tailwind v4 utilities (`bg-picker-background`, `rounded-picker`). `shadcn.css` maps them to a shadcn/ui theme. The structural CSS is in the `base` cascade layer, so classes and unlayered CSS override it; `cssLayer` on `Root` changes the layer.

## Data

`data/en.json` is built from emojibase and its iamcal (Slack) shortcodes: 1,923 emoji, 1,914 with shortcodes, 192 KB (50 KB gzipped). Skin-tone variations are computed at load. The provider's `filter` removes emoji from pickers and search.

## Localization

The package ships English. To build a dataset for another language, run the `build-data` command with an [emojibase locale](https://emojibase.dev/docs/datasets/#supported-locales):

```bash
npm install --save-dev emojibase-data
npx @brianhung/emoji-picker build-data ja --out public/emoji/ja.json
```

The dataset has the locale's emoji names, tags, and category names, and the same format as `en.json`. Every locale keeps Slack's English shortcodes, so `:thumbsup:` works everywhere, followed by the locale's CLDR shortcodes (`:samuzuappu:`). Choose other emojibase sets with `--shortcodes`, for example `--shortcodes iamcal,cldr-native`.

Pass the dataset as `data`:

```tsx
<EmojiProvider data="/emoji/ja.json">…</EmojiProvider>
```

Search follows the dataset's `locale`: it normalizes text (NFKC, so full-width `ｆｉｒｅ` finds 🔥), lowercases by the locale's rules (Turkish `İ` becomes `i`), splits Japanese, Chinese, and Thai into words with `Intl.Segmenter`, and orders alphabetical shortcode completion with `Intl.Collator`. Set `locale` on the provider to override the dataset's tag.

To change how text becomes words, pass a `segmenter` (any object with `Intl.Segmenter`'s `segment()`) or replace the tokenizer. A tokenizer receives text and returns words; it splits both the indexed names and the query.

```tsx
import { lexical } from "@brianhung/emoji-picker/search";

const bigrams = (text: string) => Array.from({ length: Math.max(1, text.length - 1) }, (_, i) => text.slice(i, i + 2));

<EmojiProvider data="/emoji/zh.json" search={lexical({ tokenize: bigrams })}>…</EmojiProvider>
```

Interface strings are defined in `EmojiLabels`, exported from `@brianhung/emoji-picker/core` with English defaults in `defaultLabels`. Pass any of them as the provider's `labels`; its `locale` also sets React Aria's locale (text direction) and formats the default result count. Counts are functions; `plural()` builds one from CLDR plural forms and formats the number for the locale:

```ts
import { defaultLabels, plural, type EmojiLabels } from "@brianhung/emoji-picker/core";

const ja: EmojiLabels = {
  ...defaultLabels,
  searchPlaceholder: "検索",
  resultCount: plural("ja", { "=0": "結果なし", other: "#件の結果" }),
  // …
};
```


## Development

This package is part of a monorepo; see the [root README](../../README.md).

```bash
npm test                                         # unit tests
npm run typecheck
npm run build                                    # data/en.json and dist/
npm run test:e2e                                 # browser checks against the demo at :5199
npm run test:a11y
```

To run the browser checks without the demo, start `npm run e2e:serve` and set `BASE_URL=http://localhost:5299`.

## License

MIT. Third-party notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
