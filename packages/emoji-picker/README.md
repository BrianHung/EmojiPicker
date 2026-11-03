# @brianhung/emoji-picker

Headless, shadcn-style React emoji picker built on the [emoji-picker-react](https://github.com/ealush/emoji-picker-react) v5 primitives. It adds:

- **iMessage-style tapbacks**: your top 5 emoji (decayed by recency), with a "+" that expands into the full picker
- **Slack shortcodes** (`:thumbsup:`, `:+1::skin-tone-4:`) in picker search, in selections, as `:thu` autocomplete and on send
- **Platform-aware rendering**: native emoji on Apple and Android, [Twemoji](https://github.com/jdecked/twemoji) where the system can't draw flags (Windows)
- **Custom emoji and sections**, custom rows and cells, and pluggable data and frequency storage
- **One shared store**: data, search index, frequents and skin tone are shared by every picker under a provider

> v3 is a full rewrite. Nothing from `react-twemoji-picker` (v1) carries over.

## Usage

```tsx
import { EmojiProvider, EmojiPicker, Tapback } from "@brianhung/emoji-picker";
import enUrl from "@brianhung/emoji-picker/data/en.json?url"; // a separate, cacheable asset

<EmojiProvider data={enUrl} renderer="auto">
  <EmojiPicker.Root onSelect={(e) => insert(e.emoji)} className="h-[380px] w-[352px]">
    <EmojiPicker.Search><EmojiPicker.SkinTone /></EmojiPicker.Search>
    <EmojiPicker.Viewport>
      <EmojiPicker.List />
      <EmojiPicker.Empty>No emoji found.</EmojiPicker.Empty>
    </EmojiPicker.Viewport>
  </EmojiPicker.Root>

  <Tapback onSelect={(e) => react(message.id, e.unified)} />
</EmojiProvider>
```

### shadcn/ui

```bash
npx shadcn@latest add https://emoji.brianhung.me/r/emoji-picker.json
```

This adds `components/ui/emoji-picker.tsx` (you own it) with `EmojiPickerCard`, `EmojiPickerPopover`, `EmojiTapback`, `EmojiPickerBody` and `EmojiPickerFooter`, styled with your theme's tokens:

```tsx
<EmojiProvider data={en}>
  <EmojiPickerPopover onSelect={(e) => react(e.unified)}>🙂 Add reaction</EmojiPickerPopover>
</EmojiProvider>
```

The source is `apps/demo/registry/emoji-picker.tsx`; `npm run build:registry -w demo` writes `apps/demo/public/r/`.

### Popover

`EmojiPopover` is unstyled: it positions the content next to the trigger (flipping and clamping to the viewport), closes on Escape, an outside click, or a pick from any picker inside, and returns focus to the trigger. Popovers nest (a tapback's "+" inside a message menu).

```tsx
<EmojiPopover.Root>
  <EmojiPopover.Trigger asChild><Button variant="outline">🙂</Button></EmojiPopover.Trigger>
  <EmojiPopover.Content side="top" align="end" className="…">
    <EmojiPicker.Root onSelect={insert}>…</EmojiPicker.Root>
  </EmojiPopover.Content>
</EmojiPopover.Root>
```

Pass `anchor` to position against something other than the Trigger: an element, a virtual element (`{ getBoundingClientRect }`), or a function returning a rect, such as an editor's caret. Then control `open` yourself; no Trigger is needed.

### Rich-text editors (Tiptap, ProseMirror)

`useShortcodeAutocomplete` works on a plain input's text and caret. In an editor, let the editor find the `:` trigger and hand the query to `useEmojiSuggestions`, which does the ranking, highlighting, keys and ARIA. Its `onKeyDown` takes React or DOM keyboard events, so you can forward the editor's events to it as they are.

```tsx
const menu = useEmojiSuggestions({
  query, // e.g. from @tiptap/suggestion
  onChoose: (s) => editor.chain().focus().deleteRange(range).insertContent(menu.textFor(s) + " ").run(),
});
// in the suggestion plugin: onKeyDown: ({ event }) => menu.onKeyDown(event)

<EmojiPopover.Root open={menu.open}>
  <EmojiPopover.Content anchor={() => clientRect()}>
    <ul {...menu.getListProps()}>
      {menu.suggestions.map((s, i) => <li key={s.record.unified} {...menu.getOptionProps(i)}>…</li>)}
    </ul>
  </EmojiPopover.Content>
</EmojiPopover.Root>
```

A complete Tiptap extension is in [apps/demo/examples/tiptap](../../apps/demo/examples/tiptap/emoji-suggestion.tsx).

Shortcode matches are ordered by relevance: exact, then prefix, then a word inside a code, then name and tag matches. `order: "alphabetical"` lists prefix matches A–Z, then the rest A–Z, as Discord does (`:smi` → `smile`, `smile_cat`, `smiley`, …, `blush`, `grimacing`). Both hooks take it.

## Search

Search is a function: `(query, context) => hits | Promise<hits>`. The picker, `useEmojiSearch` and the results grid only call it, so you can replace it, wrap it or compose it.

```tsx
import Fuse from "fuse.js";
import { fallback, fuse, lexical, preferFrequent, remote, rerank } from "@brianhung/emoji-picker/search";

<EmojiProvider data={en}>                                              // lexical(): the default
<EmojiProvider data={en} search={fallback(lexical(), fuse(Fuse))}>     // Fuse only when lexical finds < 8
<EmojiProvider data={en} search={rerank(lexical(), preferFrequent())}> // your most-used emoji move up
<EmojiProvider data={en} search={remote((q, { signal }) =>             // your endpoint, embeddings, a classifier
  fetch(`/api/emoji?q=${encodeURIComponent(q)}`, { signal }).then((r) => r.json()))}>
```

`context` has `records` (every emoji, custom ones included), `limit`, `signal` (aborted when the query changes) and `frequency(unified)` (the user's decayed use count). Return `{ unified, score? }[]` best first, or plain unified codes through `remote`.

- **`lexical({ typos })`**: a sorted word index over shortcodes, names and tags. A whole shortcode ranks above a name word, above a tag; the last word matches as a prefix. When it finds fewer than 8, misspelled words are corrected against the index (`rokcet` → 🚀, `thumsb up` → 👍). About 0.04 ms per query, no dependencies.
- **`fallback(a, b, { min })`**, **`merge(...searches)`** (reciprocal rank fusion), **`rerank(search, ...rerankers)`**, **`preferFrequent({ weight })`**, **`remote(fetcher)`**, **`fuse(Fuse, options)`** (Fuse is passed in, so it stays optional).
- Sync searches render in the same frame. An async search keeps the previous results on screen (the grid is `aria-busy`) until it settles, and each new query aborts the last request.

Results replace the category list while a query is active:

```tsx
<EmojiPicker.Root searchResults="ranked">  {/* one list, best first; the top result is highlighted and Enter picks it */}
<EmojiPicker.Root searchResults="grouped"> {/* category sections, each in rank order */}
```

They use your `Emoji` and `CategoryHeader` components, arrow keys move the highlight from the search input, and `useActiveEmoji()` (for a preview footer) follows it. Outside the picker, `useEmojiSearch(query)` returns the same results and `useEmojiSearchState(query)` adds `pending`.

### Collapsible sections

A collapsed section keeps its header and hides its rows. Collapse is controlled on `Root`; the header toggles it.

```tsx
<EmojiPicker.Root defaultCollapsedCategories={["flags"]}>       {/* uncontrolled */}
<EmojiPicker.Root collapsedCategories={ids} onCollapsedCategoriesChange={setIds}> {/* controlled */}
```

```tsx
function Header({ category, children, ...props }: CategoryHeaderProps) {
  return (
    <div {...props} aria-hidden={undefined}>
      <button type="button" aria-expanded={!category.collapsed} onClick={category.toggleCollapsed}>
        {children}
        <ChevronDown className="in-data-collapsed:-rotate-90" />
      </button>
    </div>
  );
}

<EmojiPicker.List components={{ CategoryHeader: Header }} />
```

| | |
|---|---|
| `collapsedCategories` / `defaultCollapsedCategories` | `string[]` of category ids (`"suggested"`, `"smileys_people"`, `"custom:<group>"`, …) |
| `onCollapsedCategoriesChange` | `(ids: string[]) => void` |
| `category.collapsed`, `category.toggleCollapsed()` | on `CategoryHeaderProps` |
| `data-collapsed` | on the header (`data-slot="category-header"`) of a collapsed section |
| `useCollapsedCategories()` | `{ collapsed, isCollapsed(id), toggle(id), setCollapsed(id, value) }` inside `Root` |

- The engine's header is `aria-hidden`; drop that (as above) when the header holds a button.
- Arrow keys skip collapsed sections. A `CategoryNav` tab for a collapsed section expands it, then scrolls to it.
- Search results ignore collapse. In results, `toggleCollapsed` does nothing.
- State lives in `Root`, so it resets when the picker unmounts (a popover closing). Control it to keep it longer.
- Known limit: the engine's virtualization doesn't count the headers of collapsed sections. When the collapsed headers above a section add up to more than two rows of cells, its rows at the top edge of the viewport stay blank.

### Horizontal list

`orientation="horizontal"` lays the sections out side by side, as the iOS and Gboard emoji keyboards do. Each section is a grid of `rows` rows filled column by column, with its title above its first column; the Viewport scrolls sideways.

```tsx
<EmojiPicker.Root className="h-[300px] w-[402px] [--emoji-cell-width:46px] [--emoji-cell-height:38px]">
  <EmojiPicker.Search />
  <EmojiPicker.Viewport className="flex-none">
    <EmojiPicker.List orientation="horizontal" rows={5} />
    <EmojiPicker.Empty>No emoji found.</EmojiPicker.Empty>
  </EmojiPicker.Viewport>
  <EmojiPicker.CategoryNav />
</EmojiPicker.Root>
```

| `List` prop | |
|---|---|
| `orientation` | `"vertical"` (default) or `"horizontal"` |
| `rows` | rows per section. Default 5 |
| `searchRows` | rows while search results show. Default `rows` |

- The same parts, slots and props apply: `data-slot="list"` (with `data-orientation="horizontal"`), `category-header` and `emoji` cells, `data-highlighted` / `data-active`, `cellClassName`, `headerClassName`, `components`, custom emoji, the shared skin tone, the frequently used / `suggested` section, and `categories` (order, names, `nav: false`).
- Only the columns near the viewport render, about 100 of the ~1,900 cells at a time; the rendered window moves four columns at a time.
- `CategoryNav` follows the horizontal scroll, and a tab scrolls the strip to its section. `useCategoryNavigation()` reports the same.
- Keys: Up and Down move within a column; Left and Right move along a row and continue into the next or previous section; Home and End go to the first and last emoji; Enter picks. Up from the top row focuses the search field and Down from the bottom row the category bar, when they sit on that side. Down from the search field enters the grid. One cell is in the tab order (`role="grid"`, `role="row"`, `role="gridcell"`).
- Titles are `position: sticky`, so a title stays at the start edge while its section scrolls past. A section is at least `--emoji-section-min-width` wide, so a short section still fits its title.
- Search results use the same layout: one untitled section (`searchResults="ranked"`, the default) or one per category (`"grouped"`), starting at the beginning of the strip. Arrow keys in the search field move the highlight through it. iOS shows results as one row; pass `searchRows={1}` for that.
- Collapsed sections are left out of the strip. Their tab expands them and scrolls there.
- The Viewport gets `overflow-x: auto` and `overscroll-behavior-x: contain`, so a swipe past either end doesn't trigger the browser's back or forward navigation. `scrollbar-width: none` on the Viewport hides the scrollbar.
- The Viewport needs a height (or `flex-none`); the List is as tall as its title band plus `rows` cells.

Known limits: no long-press skin-tone menu on cells (the `SkinTone` part and the shared tone still apply); right-to-left pages get mirrored arrow keys but a left-to-right strip; in development the engine logs that the Viewport has no `<List>`, because the horizontal List renders its own grid.

## Styling

Parts are unstyled. Style them with classes, plain CSS, or CSS variables; nothing needs to target emoji-picker-react's markup.

**Slots.** Every part and cell has a stable `data-slot`: `emoji-picker`, `search`, `search-input`, `search-clear`, `category-nav`, `category-tab`, `viewport`, `list`, `category-header`, `emoji`, `skin-tone`, `skin-tone-option`, `skin-tone-options`, `reactions`, `reactions-expand`, `preview`, `panel`, `empty`, `loading`. State is exposed as attributes: `data-active` (current category tab), `data-highlighted` (keyboard highlight), `data-has-variations`, `data-unified`, `data-state="open"` (skin tone), `data-collapsed` (a collapsed section's header).

```css
[data-slot="emoji"][data-highlighted] { background: var(--emoji-picker-selected); }
```

`Search` and `CategoryNav` are the flex rows themselves: `gap`, `justify-*` and `flex-col` on their `className` lay out their children directly.

Repeated elements take class props, so most designs need no custom components: `List` `cellClassName` / `headerClassName`, `CategoryNav` `tabClassName` (the current tab has `data-active`), `SkinTone` `buttonClassName` and `emoji="270b"` (✋ in each tone instead of swatches). Tab icons come from `categories={[{ id, icon }]}`; `{ id, nav: false }` keeps a section out of the bar. Emoji glyphs are sized by `--emoji-size`, not by a font-size class on the cell.

**Sizes.** CSS variables, set on `Root` or any ancestor:

| Variable | Default | |
|---|---|---|
| `--emoji-size` | `30px` | glyph / image size |
| `--emoji-cell-size` | size + 10px | grid pitch (rows and columns) |
| `--emoji-image-size` | `--emoji-size` | image emoji (Twemoji, custom) inside the cell |
| `--emoji-list-padding` | `10px` | inline padding of the grid |
| `--emoji-header-height` | `40px` | section title height |
| `--emoji-cell-width` / `--emoji-cell-height` | `--emoji-cell-size` | horizontal list only: column and row pitch |
| `--emoji-section-gap` | `--emoji-list-padding` | horizontal list only: space between sections |
| `--emoji-section-min-width` | `0px` | horizontal list only: narrowest section |
| `--emoji-font-family` | the engine's emoji font stack | font of native emoji; put a text font first to align emoji on its baseline |
| `--emoji-skin-tone-size` | `15px` | default skin-tone swatch |

**Colors.** `tokens.css` defines `--emoji-picker-{background, foreground, muted, subtle, border, input, input-border, panel, hover, selected, accent, ring, radius, shadow, font}`. Each reads the [MCP Apps standard variable](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx) first (`--color-background-primary`, `--color-text-secondary`, `--border-radius-lg`, …), then a `light-dark()` default, so one definition covers both themes via `color-scheme`. Override any subset.

```css
@import "tailwindcss";
@import "@brianhung/emoji-picker/tokens.css";
@import "@brianhung/emoji-picker/theme.css"; /* bg-picker-background, text-picker-muted, rounded-picker, … */

.my-picker { --emoji-picker-accent: light-dark(#83388a, #d18fd6); }
```

**shadcn/ui.** Import `shadcn.css` to map the tokens to your shadcn theme (`--popover`, `--border`, `--accent`, `--ring`, `--radius`, …). It expects shadcn's Tailwind v4 variables.

```css
@import "@brianhung/emoji-picker/tokens.css";
@import "@brianhung/emoji-picker/shadcn.css";
```

**Cascade.** The engine's structural CSS is emitted in the `base` layer (`cssLayer` on `Root` changes it), after Tailwind's preflight and before utilities, so any class or unlayered CSS overrides it without an `@layer` declaration.

## Data

`npm run build:data` builds `data/en.json` from `emojibase-data` and the iamcal (Slack) shortcodes:

- 1,923 emoji, 1,914 with shortcodes
- 191 KB raw / 49 KB gzipped
- Skin-tone variations are computed at runtime (verified against emojibase; 7 two-person exceptions are stored)

`data` also accepts a loader (`({ signal }) => Promise<Dataset>`) or a dataset object. `filter` trims what shows in the picker and search. For one picker, `<EmojiPicker.Root emojiVersion={15.1}>` hides emoji added after that emoji version (for fonts that lack them), in the list and in search results.

## Development

This package lives in a monorepo; see the [root README](../../README.md). From the repo root:

```bash
npm install
npm run dev        # demo site on http://localhost:5199 (uses this package's source)
npm test           # this package's tests
npm run build      # data + library (dist/), then the site
```

See [PLAN.md](../../PLAN.md) for the design, benchmarks and the Twemoji font prototype plan.

## Credits

Emoji data from [emojibase](https://emojibase.dev). Shortcodes from [iamcal/emoji-data](https://github.com/iamcal/emoji-data). Twemoji graphics © Twitter and contributors (jdecked fork), CC-BY 4.0.
