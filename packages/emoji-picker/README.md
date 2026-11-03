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
npx shadcn@latest add https://emojis.brianhung.me/r/emoji-picker.json
```

This adds `components/ui/emoji-picker.tsx` (you own it) with `EmojiPickerCard`, `EmojiPickerPopover`, `EmojiTapback`, `EmojiPickerBody` and `EmojiPickerFooter`, styled with your theme's tokens:

```tsx
<EmojiProvider data={en}>
  <EmojiPickerPopover onSelect={(e) => react(e.unified)}>🙂 Add reaction</EmojiPickerPopover>
</EmojiProvider>
```

The source is `apps/demo/registry/emoji-picker.tsx`; `npm run build:registry -w demo` writes `apps/demo/public/r/`.

### Popover

`EmojiPopover` is unstyled: it positions the content next to the trigger (flipping and clamping to the viewport), closes on Escape, an outside click, or a pick from any picker inside, and returns focus to the trigger. Popovers nest (a tapback's "+" inside a message menu). Once positioned it focuses `initialFocus` (a ref or function; `false` to leave focus alone), by default the first `[data-autofocus]` inside: a picker's search field. `closeOnSelect={false}` keeps it open after a pick, with focus and the highlight where they were.

```tsx
<EmojiPopover.Root>
  <EmojiPopover.Trigger asChild><Button variant="outline">🙂</Button></EmojiPopover.Trigger>
  <EmojiPopover.Content side="top" align="end" className="…">
    <EmojiPicker.Root onSelect={insert}>…</EmojiPicker.Root>
  </EmojiPopover.Content>
</EmojiPopover.Root>
```

#### Animating

Nothing animates by default. Content exposes what CSS transitions need:

| | |
|---|---|
| `data-starting-style` | on the first frame after mounting: style the closed state here |
| `data-ending-style` | while closing; the content unmounts when its transitions and animations finish |
| `data-state` | `"open"` / `"closed"` |
| `data-side`, `data-align` | where it ended up after flipping |
| `--transform-origin` | the trigger's center on the edge facing it, in the content's coordinates |

```css
.emoji-popover {
  transform-origin: var(--transform-origin);
  transition: opacity 150ms cubic-bezier(0.23, 1, 0.32, 1), scale 150ms cubic-bezier(0.23, 1, 0.32, 1);
}
.emoji-popover[data-starting-style],
.emoji-popover[data-ending-style] { opacity: 0; scale: 0.95; }
.emoji-popover[data-ending-style] { transition-duration: 100ms; }
@media (prefers-reduced-motion: reduce) {
  .emoji-popover[data-starting-style], .emoji-popover[data-ending-style] { scale: 1; } /* fade only */
}
```

Use transitions, not keyframes: reopening mid-exit reverses from where it is. While closing, the content is `inert` and focus is already back on the trigger. Tailwind: `origin-(--transform-origin) transition-[opacity,scale] duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0 motion-safe:data-starting-style:scale-95 motion-safe:data-ending-style:scale-95`.

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

A complete Tiptap extension is in [apps/demo/src/components/tiptap](../../apps/demo/src/components/tiptap/emoji-suggestion.tsx).

Shortcode matches are ordered by relevance: exact, then prefix, then a word inside a code, then name and tag matches. `order: "alphabetical"` lists prefix matches A–Z, then the rest A–Z, as Discord does (`:smi` → `smile`, `smile_cat`, `smiley`, …, `blush`, `grimacing`). Both hooks take it.

### Rendering one emoji

`<Emoji emoji={…} />` draws one emoji the way the pickers do (native, Twemoji or a custom image), from whatever your app stores:

```tsx
<Emoji emoji="🎉" />                 // native text, skin tones and ZWJ sequences included
<Emoji emoji=":tada:" />             // a shortcode, with or without colons; custom ones too (":partyparrot:")
<Emoji emoji="1f389" size={20} />    // a unified code or a custom emoji id
<Emoji emoji={selection} />          // an EmojiSelection from onSelect, an EmojiRecord, or a CustomEmoji object
```

Resolution order: object, native emoji, `:shortcode:`, unified code or custom id, bare shortcode. Unknown input renders as its literal text (`:code:`) with `data-emoji-missing`; while data loads, a shortcode holds its space. `useEmoji(input)` returns the resolved `{ unified, record, imageUrl, name, native }`, and `resolveEmoji(store, input)` is the same without React. `unified` still works as a deprecated alias of `emoji`.

### Artwork overrides

Draw particular standard emoji with your own art in part of the UI. They stay the same emoji: `onSelect`, search and frequents see the standard code.

```tsx
// iMessage-style tapback art
const tapbackArt = {
  "2764-fe0f": "/tapback/heart.svg",   // ❤️
  "1f44d": "/tapback/thumbs-up.svg",   // 👍 (every skin tone, unless a toned key is given)
  "1f44e": "/tapback/thumbs-down.svg", // 👎
  "1f602": "/tapback/haha.svg",        // 😂
  "203c-fe0f": "/tapback/emphasis.svg",// ‼️
  "2753": <QuestionMark />,            // ❓ any node: an inline SVG, a component
};

<Tapback artwork={tapbackArt} onSelect={react} />
<EmojiOverrides artwork={tapbackArt}><MessageReactions /></EmojiOverrides>
```

- `EmojiOverrides` applies to everything inside: `<Emoji>`, picker cells, search results, the horizontal list, tapback reactions. Nested scopes merge; the inner one wins. Root and Tapback take the same map as `artwork`.
- Keys are unified codes, matched with or without U+FE0F; a base code covers its skin tones.
- Overridden cells have `data-overridden`. For a preview footer, render `<Emoji emoji={useActiveEmoji()} />` to get the art; the engine's `Preview` part draws the standard emoji.

### Large custom emoji packs

`customEmojis` takes an array, a pack's JSON URL, a loader, or an array mixing them (one per pack). Packs load with the data, in parallel, when a picker first needs them (or in idle time); a URL is fetched once per page. A pack that fails is left out (`store.packErrors()`), and the rest of the picker works.

```tsx
<EmojiProvider data={en} customEmojis={["/packs/frogs.json", ({ signal }) => fetchSlackEmoji(signal), [{ id: "shipit", name: "ship it", imageUrl: "/shipit.png" }]]}>
```

| `CustomEmoji` field | |
|---|---|
| `id`, `name`, `imageUrl`, `shortcodes`, `tags`, `group` | as before; `group` makes a section (`categories={[{ id: "custom:frogs" }]}`) |
| `width`, `height` | intrinsic size (default square); non-square images fit inside the cell |
| `animated`, `stillUrl` | grids show the still and play `imageUrl` only while the emoji is hovered or highlighted; `<Emoji animate={false}>` keeps it still. Never animates with `prefers-reduced-motion` |
| `base` | a standard emoji (`"1f35e"`) whose name and tags it also matches: a bread frog found by "bread" |

- Search also matches the words of ids and shortcodes: `sleepyFrogFamily`, `sleepy_frog-family` match "frog family".
- Only rows on screen render, so only their images load: a 1,500-emoji pack requests nothing until scrolled to, then about one viewport (~60 images). Every image is `loading="lazy"`, `decoding="async"`, sized up front (no layout shift), not draggable, with the emoji's name as `alt`.
- An image that fails to load (a Twemoji asset missing for a new emoji) shows the native character, or an empty, named box for a custom emoji; never a broken image. With `renderer="twemoji"`, emoji newer than the Twemoji set (`TWEMOJI_EMOJI_VERSION`, 17 for the pinned 17.0.3; `twemojiVersion` on the provider for a self-hosted set) are left out of pickers.

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
- **`progressive(fast, slow)`**: `fast` results render at once, `slow` ones replace them when they arrive (`progressive(lexical(), remote(…))`); a failed slow search keeps the fast results, and `pending` is true meanwhile. Any async search can do the same by returning `withInterim(promise, hits)`.
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
- Keys: Up and Down move within a column; Left and Right move along a row and continue into the next or previous section; PageUp and PageDown move a viewport of columns; Home and End go to the first and last emoji; Enter picks. Up from the top row focuses the search field and Down from the bottom row the category bar, when they sit on that side. Down from the search field enters the grid. One cell is in the tab order (`role="grid"`, `role="row"`, `role="gridcell"`).
- Right to left (`dir="rtl"`), the strip starts at the right and scrolls left; Left goes to the next emoji.
- Titles are `position: sticky`, so a title stays at the start edge while its section scrolls past. A section is at least `--emoji-section-min-width` wide, so a short section still fits its title.
- Search results use the same layout: one untitled section (`searchResults="ranked"`, the default) or one per category (`"grouped"`), starting at the beginning of the strip. Arrow keys in the search field move the highlight through it. iOS shows results as one row; pass `searchRows={1}` for that.
- Collapsed sections are left out of the strip. Their tab expands them and scrolls there.
- The Viewport gets `overflow-x: auto` and `overscroll-behavior-x: contain`, so a swipe past either end doesn't trigger the browser's back or forward navigation. `scrollbar-width: none` on the Viewport hides the scrollbar.
- The Viewport needs a height (or `flex-none`); the List is as tall as its title band plus `rows` cells.

Known limits: no long-press skin-tone menu on cells (the `SkinTone` part and the shared tone still apply); in development the engine logs that the Viewport has no `<List>`, because the horizontal List renders its own grid.

## Keyboard

Keys are actions; Root's `keymap` binds them. Every layout (vertical List, search results, horizontal List, Tapback) gives the same action the same meaning.

| Action | Default | |
|---|---|---|
| `move-up` / `move-down` | ArrowUp / ArrowDown | a row; from the search field Down enters the grid |
| `move-left` / `move-right` | ArrowLeft / ArrowRight | a cell. Physical: right to left, Left goes to the next emoji. In the search field only with the caret at the end |
| `page-up` / `page-down` | PageUp / PageDown | the rows that fit in the Viewport (horizontal List: its columns) |
| `first` / `last` | Home, Ctrl+Home / End, Ctrl+End | first and last emoji; the reaction row's and tab bar's ends. In the search field Home/End move the caret, so use Ctrl+Home/End |
| `select` | Enter | pick the focused or highlighted emoji |
| `close` | Escape | close the surrounding `EmojiPopover` (or an open skin-tone menu) |
| `focus-search` | / | from anywhere in the picker but a text field |
| `toggle-skin-tone` | (none) | open or close `SkinTone` |

Two Root options decide where the keyboard position lives:

| | `focusModel="input"` (default) | `focusModel="grid"` |
|---|---|---|
| Arrows from the search field | move a highlight; focus stays in the field (combobox, `aria-activedescendant`) | Down (or Right at the end of the text) moves focus into the cells (roving tabindex) |
| Enter | picks the highlight | picks the focused cell |
| Like | Linear, Discord | Slack |

| | `pointer="follows"` (default) | `pointer="independent"` |
|---|---|---|
| Hover | becomes the highlight; arrows continue from it, Enter picks it. In `"grid"`, focus follows the pointer once it's in the grid | a hover style only; arrows continue from the keyboard position |
| Like | Discord, v0.1 of this picker | Linear, Slack |

The footer (`useActiveEmoji`) previews the hovered emoji in every mode. Left and Right only leave the text when the caret is at its end. The highlight is `data-highlighted` on the cell (the focused cell is `:focus-visible`).

After a pick, the position stays: the field keeps focus and the highlight, a focused cell keeps focus, and results don't take focus when clicked (`"input"`). The frequently used row doesn't reorder while focus or the pointer is in the picker. Keys never animate: scrolling for a key is instant. Escape ends a highlight, then clears the query, then closes.

```tsx
import { DEFAULT_KEYMAP } from "@brianhung/emoji-picker";

<EmojiPicker.Root keymap={{ "move-down": ["ArrowDown", "j"], "move-up": ["ArrowUp", "k"], select: ["Enter", "Mod+Enter"], "toggle-skin-tone": ["Shift+T"] }}>
```

- A binding replaces the action's defaults; `[]` unbinds it. Keys are `KeyboardEvent.key` values with `Ctrl+`, `Alt+`, `Shift+`, `Meta+` or `Mod+` (⌘ on Apple platforms, Ctrl elsewhere). Letters match either case; Shift is optional for symbols like `?` unless written. On macOS, Alt (Option) changes `event.key` (Alt+t is "†"), so prefer Ctrl, Mod or Shift chords.
- Printable keys and Home/End in the search field always type: `j` above still types a "j" there.
- Not remappable: Space (skin-tone variations on a cell), Tab, type-to-search from the grid.
- The search field and the grid read the same keymap, so a binding applies in both: `{ "move-down": ["ArrowDown", "Tab"] }` also makes Tab enter the list.

**Intercepting.** A part's `onKeyDown` (Root, Search, `Search inputProps`, Viewport, List, CategoryNav) runs before the picker's handling, innermost first. Call `event.preventEmojiPickerHandler()` to keep the picker out of it; the event still propagates, and `event.emojiPickerHandlerPrevented` reports it. Calling `preventDefault()` also stops the picker.

```tsx
<EmojiPicker.List
  onKeyDown={(event) => {
    if (event.key === "Enter" && event.shiftKey) {
      event.preventEmojiPickerHandler();
      insertAndKeepOpen(); // your own handling
    }
  }}
/>
```

Escape is the exception: with text in the search field, the engine clears it before any handler runs; the next Escape is `close`.

## Accessibility

Each part follows its WAI-ARIA APG pattern; `npm run test:a11y` runs axe-core and these checks in a browser.

| Part | Roles and states | Keys |
|---|---|---|
| Search field | `combobox` with `aria-controls` (the list shown) and, in `focusModel="input"`, `aria-activedescendant` (the highlighted cell) | the keymap; Escape ends a highlight, then clears the query |
| Search status | one `status` live region: "24 results", "No results" | |
| List, search results, horizontal list | `grid` > `row` > `gridcell` buttons named by the emoji ("thumbs up: medium skin tone", a custom emoji's name); `aria-selected` on the highlight; `aria-busy` while an async search runs | the keymap; one tab stop in `"grid"` |
| CategoryNav | `tablist` of `tab`s with `aria-selected` | arrows, Home/End |
| Section titles | collapsed sections' headers carry `data-collapsed`; a custom header with a button sets `aria-expanded` (see Collapsible sections) | |
| SkinTone | a button with `aria-haspopup`/`aria-expanded`, opening a `radiogroup` of `radio`s | arrows, Home/End; Escape closes and returns focus |
| Tapback | a labelled list of buttons, one tab stop (roving); `selected` marks the user's reactions `aria-pressed` | arrows, Home/End |
| EmojiPopover | trigger: `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`; content: `dialog`, named "Emoji picker" unless you pass `aria-label`/`aria-labelledby` | Escape closes; focus moves in once visible and back to the trigger. Not modal, so no focus trap |
| Autocomplete hooks | `combobox` + `listbox`/`option`, `aria-activedescendant` (`getInputProps`, `getListProps`, `getOptionProps`) | arrows, Enter/Tab, Escape |
| `<Emoji>` | `role="img"` named by the emoji; `decorative` hides it | |
| Empty, Loading | `status` | |

Focus styles: the highlight is `data-highlighted`, the focused cell `:focus-visible`. Motion: the library animates nothing; animated custom emoji stay still and `prefers-reduced-motion` is honoured everywhere it could move (popover hooks, smooth tab jumps). Known: the engine renders its list as `ul[role=grid] > li[role=rowgroup]` (axe's minor `aria-allowed-role`; the accessibility tree is right).

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
