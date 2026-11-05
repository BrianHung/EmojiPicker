# @brianhung/emoji-picker

Unstyled React components for emoji pickers, tapbacks, and shortcode autocomplete.

## Overview

The library builds on [React Aria](https://react-spectrum.adobe.com/react-aria/) (`Autocomplete`, `SearchField`, `Toolbar`, and `useListBox` over a virtualized grid) and adds:

- Tapbacks: the user's most-used emoji, with a button that expands into the full picker.
- Slack shortcodes (`:thumbsup:`, `:+1::skin-tone-4:`) in search, in selections, and as `:thu` autocomplete.
- Native emoji on Apple and Android, and [Twemoji](https://github.com/jdecked/twemoji) where the system can't draw flags.
- Custom emoji, artwork overrides, collapsible sections, and a horizontal list.
- Replaceable search, from a built-in word index to embeddings.

One `EmojiProvider` holds the data, search index, frequently used emoji, and skin tone for every picker below it.

## Getting started

```bash
npm install @brianhung/emoji-picker @brianhung/emoji-picker-core
```

`@brianhung/emoji-picker` is the React layer. `@brianhung/emoji-picker-core` has no dependencies and owns the data, search, stores and every extension contract (`EmojiSearch`, `EmojiStorage`, `CustomEmojiSource`, the dataset format); import its types from there.

```tsx
import { EmojiPicker, EmojiProvider, Tapback } from "@brianhung/emoji-picker";
import en from "@brianhung/emoji-picker-core/data/en.json?url"; // Vite; other bundlers have their own asset imports

<EmojiProvider data={en}>
  <EmojiPicker.Root onSelect={(selection) => insert(selection.emoji)} className="h-[380px] w-[352px]">
    <EmojiPicker.Search>
      <EmojiPicker.Search.Input />
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

Without `data`, the provider loads `data/en.json` from jsDelivr, pinned to the installed core version.

`EmojiPicker.Root` creates a provider with these defaults when none is above it.

Each part is also exported on its own (`EmojiPickerRoot`, `EmojiPickerSearch`, `EmojiPickerViewport`, `EmojiPickerList`, …) for bundlers such as esbuild that keep every member of a namespace import.

To copy a styled shadcn/ui version into your project:

```bash
npx shadcn@latest add https://emoji.brianhung.me/r/emoji-picker.json
```

It adds `components/ui/emoji-picker.tsx` with `EmojiPickerCard`, `EmojiTapback`, `EmojiPickerBody`, and `EmojiPickerFooter`.

To open it from a trigger in your own shadcn/ui popover (Base UI or Radix):

```bash
npx shadcn@latest add https://emoji.brianhung.me/r/emoji-picker-popover.json
```

It adds `components/ui/emoji-picker-popover.tsx` with `EmojiPickerPopover`. With React Aria, add `emoji-picker-popover-aria.json` instead. `EmojiPickerPopover` used to live in `emoji-picker.tsx` on `EmojiPopover`; it takes `onSelect`, `side`, `align`, `className`, and `aria-label` now.

## Entry points

| Import | Contents |
|---|---|
| `@brianhung/emoji-picker` | Components and hooks, and the types React code commonly needs from core (`EmojiSelection`, `EmojiRecord`, `EmojiItem`, `CustomEmoji`, `EmojiSearch`, …) |
| `@brianhung/emoji-picker/floating-ui`, `/react-aria` | `EmojiPopover` and `EmojiSuggestions.Popover` on Floating UI or React Aria ([Popovers](#popovers)); `@floating-ui/react` is an optional peer dependency |
| `@brianhung/emoji-picker/tiptap`, `/lexical` | `:shortcode` typeahead for Tiptap and Lexical ([Your own editor](#your-own-editor)); their editor packages are optional peer dependencies |
| `@brianhung/emoji-picker/tokens.css`, `theme.css`, `shadcn.css` | Color tokens, Tailwind utilities, and the shadcn/ui bridge |
| `@brianhung/emoji-picker-core` | `createEmojiStore`, the picker's and the typeahead's state (`createPickerState`, `createEmojiSuggestions`), `resolveEmoji`, frequency storage, Twemoji helpers, tokenizers, `EmojiLabels`, the grid's rows and keyboard (`createEmojiGrid`, `moveInGrid`), and every public type. No React ([Without React](#without-react)). |
| `@brianhung/emoji-picker-core/search` | Building blocks for the provider's `search` |
| `@brianhung/emoji-picker-core/prosemirror` | The `:shortcode` typeahead as a ProseMirror plugin; `prosemirror-state` and `prosemirror-view` are optional peer dependencies |
| `@brianhung/emoji-picker-core/data/en.json` | The English dataset |

## Pickers

`EmojiPicker` is a set of parts, each with a default rendering when you leave out its children:

```
Root
├ Search                  Search.Input (field), Search.Clear (only with a query)
├ SkinTone                SkinTone.Trigger, SkinTone.Options {(tone) => SkinTone.Option}, SkinTone.Glyph
├ CategoryNav             {(category) => CategoryNav.Tab}
├ Viewport
│ ├ List                  {(section) => List.Section}
│ │ └ List.Section        List.SectionTitle, List.Items {(emoji) => List.Cell}, List.SectionActions
│ └ Empty · Loading · LoadError
├ Preview                 {({ emoji }) => …}
├ Reactions               {(emoji) => Reactions.Item}, or Reactions.Items and Reactions.Expand
└ Panel
```

Every part takes `render` (an element, whose props and ref merge with the part's, or `(props, state) => element`), and `className` and `style` as values or functions of its state; state is also on data attributes. Hooks inside a `Root`: `useActiveEmoji`, `useCategoryNavigation`, `useCollapsedCategories` and `useSearchState`.

Root's state is controllable, Base UI style (`x`, `defaultX`, `onXChange`): `query`, `value` (a value picker's chosen emoji), `highlighted` (an item id), `reactionsOpen`, and `collapsedCategories`; `SkinTone` takes `open` the same way. The provider's `skinTone`, `defaultSkinTone` and `onSkinToneChange` do the same for the shared skin tone, which `skinToneStorage` persists (localStorage by default; `null` for memory only).

```tsx
<EmojiPicker.List>
  {(section) => (
    <EmojiPicker.List.Section>
      <EmojiPicker.List.SectionTitle className="px-2 text-xs font-medium" />
      <EmojiPicker.List.Items>
        {(emoji) => <EmojiPicker.List.Cell render={<button title={emoji.label} />} className={({ highlighted }) => (highlighted ? "bg-accent" : "")} />}
      </EmojiPicker.List.Items>
    </EmojiPicker.List.Section>
  )}
</EmojiPicker.List>
```

The List's functions run only for the sections and emoji in view, and a cell re-renders only when its own state changes.

`Root` takes `onSelect`, `categories` (order, names, icons, and `nav: false`), `frequent`, `suggested`, `columns` (with `fitColumns={false}` to keep them when the width is a little short), `emojiVersion`, `searchResults`, `keymap`, `focusModel` and `pointerModel`, among others. `onSelect` receives an `EmojiSelection`: `emoji`, `unified`, `baseUnified`, `name`, `shortcode`, `skinTone`, `isCustom`, and `imageUrl`.

Search results replace the category list while a query is active. `searchResults="ranked"` shows one list, best match first; `"grouped"` shows category sections in rank order.

### Collapsible sections

A collapsed section keeps its header and hides its rows. Control collapse with `collapsedCategories` and `onCollapsedCategoriesChange`, or set `defaultCollapsedCategories`.

A section title (`List.SectionTitle`) is text inside the listbox; its state has `collapsed`. Controls for a title, such as a collapse chevron or a "Customize" link, go in `List.SectionActions`: they render in a layer over the list, outside the listbox, pinned with the title as it sticks.

```tsx
<EmojiPicker.List>
  {() => (
    <EmojiPicker.List.Section>
      <EmojiPicker.List.SectionTitle />
      <EmojiPicker.List.Items />
      <EmojiPicker.List.SectionActions>
        {({ section, toggle, toggleProps }) => <button type="button" {...toggleProps} aria-label={section.name} onClick={toggle} className="absolute inset-0" />}
      </EmojiPicker.List.SectionActions>
    </EmojiPicker.List.Section>
  )}
</EmojiPicker.List>
```

`toggleProps` carries `aria-expanded` (no `aria-controls`: the list is virtualized, so a section out of view has no element to point at). Search results ignore collapse.

### Horizontal list

`<EmojiPicker.List orientation="horizontal" rows={5} />` lays sections side by side, as the iOS emoji keyboard does. Each section fills `rows` rows column by column, and the Viewport scrolls sideways. `searchRows` sets the rows for search results. Only columns near the viewport render.

### Your own virtualizer

`List` virtualizes with React Aria. For TanStack Virtual, react-window, Virtuoso or your own, call `useEmojiGrid({ rowHeight, headerHeight, columns, scrollToIndex })` inside `Root` instead: it returns the grid's `rows` (a section title, or a row of emoji, each with its `offset` and `size`), `stickyIndexes`, `getGridProps` and `getHeaderProps`, and `state` for `useEmojiCell(state, item)` in each cell (a cell re-renders only when its own highlight, hover or press changes), with the List's keyboard, highlight, hover, long press and skin-tone `variations`. `scrollToIndex(index, { align })` scrolls your virtualizer as the highlight moves. The rows and the keyboard alone, without React, are `createEmojiGrid` and `moveInGrid` in `/core`. See the [TanStack Virtual example](https://emoji.brianhung.me/examples/virtualizer/).

## Tapbacks

`Tapback` shows the user's `count` most-used emoji (iOS defaults until there's history), or fixed `reactions`. Its children are `EmojiPicker.Reactions` and an `EmojiPicker.Panel` holding the expanded picker (default: the reactions alone). `selected` makes the user's current reactions toggles with `aria-pressed`, in any skin tone. For a row of your own buttons, `ReactionBar` gives the same keyboard: one tab stop, arrows, Home and End, and focus that follows the pointer within the row.

## Popovers

`EmojiPopover` (from `/floating-ui` or `/react-aria`) positions its content next to the trigger (it flips to the other side and shifts into the viewport; `--available-width` and `--available-height` on the content), closes on Escape, an outside click, or a pick, and returns focus to the trigger, or, when a pick closes it, to `finalFocus` on the content (an element, a ref or a function: the editor a toolbar button inserts into). `closeOnSelect={false}` keeps it open after a pick. `anchor` positions it against another element, a virtual element, or a function that returns a rect, such as an editor's caret.

```tsx
<EmojiPopover.Root>
  <EmojiPopover.Trigger render={<Button variant="outline" />}>🙂</EmojiPopover.Trigger>
  <EmojiPopover.Content side="top" align="end">
    <EmojiPicker.Root onSelect={insert}>…</EmojiPicker.Root>
  </EmojiPopover.Content>
</EmojiPopover.Root>
```

Nothing animates by default. Content carries `data-starting-style` on its first frame, `data-ending-style` while closing (it unmounts when its transitions finish, and is `inert` meanwhile), `data-state`, `data-side`, `data-align`, and `--transform-origin`. Use CSS transitions so that reopening mid-exit reverses in place.

### With your own popover

A picker drops into any popover. Give its `Search.Input` `autoFocus`, and let the popover focus `pickerInitialFocus(content)` on open: the search field, else the grid's current emoji. Close it from `onSelect`.

```tsx
import { EmojiPicker, pickerInitialFocus } from "@brianhung/emoji-picker";
import { Popover } from "@base-ui-components/react/popover"; // or shadcn/ui's Popover (Radix)

// Base UI
<Popover.Root open={open} onOpenChange={setOpen}>
  <Popover.Trigger>🙂</Popover.Trigger>
  <Popover.Portal>
    <Popover.Positioner sideOffset={8}>
      <Popover.Popup ref={popup} initialFocus={() => pickerInitialFocus(popup.current)}>
        <EmojiPicker.Root onSelect={(e) => (insert(e), setOpen(false))}>…</EmojiPicker.Root>
      </Popover.Popup>
    </Popover.Positioner>
  </Popover.Portal>
</Popover.Root>

// Radix / shadcn/ui
<PopoverContent onOpenAutoFocus={(e) => { e.preventDefault(); pickerInitialFocus(e.currentTarget as HTMLElement)?.focus(); }}>
  <EmojiPicker.Root onSelect={(e) => (insert(e), setOpen(false))}>…</EmojiPicker.Root>
</PopoverContent>
```

Escape clears the query first, and the picker keeps that key; with no query it reaches the popover, which closes.

## Autocomplete

`useTextFieldEmojiTypeahead(ref)` adds `:tada` → 🎉 to an `<input>` or `<textarea>`. It owns matching, the highlight, keys, and ARIA; you render the list. In a rich-text editor, let the editor find the trigger and pass the query to `useEmojiSuggestions`:

```tsx
const menu = useEmojiSuggestions({
  query,
  onChoose: (suggestion) => editor.chain().focus().deleteRange(range).insertContent(menu.textFor(suggestion) + " ").run(),
});
// In the editor's suggestion plugin: onKeyDown: ({ event }) => menu.onKeyDown(event)
```

Both take `matchBy` (`"shortcode"` or `"search"`), `order` (`"relevance"` or `"alphabetical"`), `columns`, and `limit`. The demo has complete [Tiptap](../../apps/demo/src/components/tiptap) and [Lexical](../../apps/demo/src/components/lexical) integrations.

### Your own editor

Each editor adapter returns the same `EmojiTypeahead` (`query`, `open`, `anchor`, `suggestions`, `dismiss`), so one menu works in every editor. They forward the editor's keys and replace the typed `:query`; the caret stays in the editor, and while the menu is open the editor is a combobox (`aria-expanded`, `aria-controls`, `aria-activedescendant`).

| Import | Hook | Editor |
|---|---|---|
| `@brianhung/emoji-picker` | `useTextFieldEmojiTypeahead(ref, options)` | `<input>`, `<textarea>` |
| `@brianhung/emoji-picker/tiptap` | `useTiptapEmojiTypeahead(editor, options)` | Tiptap 3, on the ProseMirror plugin |
| `@brianhung/emoji-picker/lexical` | `useLexicalEmojiTypeahead(options)` | Lexical, inside `LexicalComposer` |
| `@brianhung/emoji-picker-core/prosemirror` | `emojiTypeahead(store, options)`, no React | ProseMirror |

```tsx
const editor = useEditor({ extensions: [StarterKit] });
const emoji = useTiptapEmojiTypeahead(editor);

<EmojiSuggestions.Popover open={emoji.open} anchor={emoji.anchor} onOpenChange={(open) => !open && emoji.dismiss()}>
  <ul {...emoji.suggestions.getListProps()}>
    {emoji.suggestions.suggestions.map((s, i) => <li key={s.shortcode} {...emoji.suggestions.getOptionProps(i)}>:{s.shortcode}:</li>)}
  </ul>
</EmojiSuggestions.Popover>
```

For any other editor, `useEmojiTypeahead(trigger, options, element)` takes three fields while a `:query` is typed (`null` otherwise):

- `query`: what follows the `:` (`findShortcodeTrigger(textBeforeCaret)` finds it),
- `anchor()`: the typed `:query`'s rect,
- `replace(text, suggestion)`: put `text` where the `:query` is.

Forward the editor's keydown to `onKeyDown` (it returns true when it handled the key), and pass `element` for the combobox attributes. The [gallery](https://emoji.brianhung.me/gallery/) renders Slack, Discord, Notion and Linear menus on a textarea, Tiptap and Lexical.

`@brianhung/emoji-picker-core/prosemirror` has no React: `emojiTypeahead(store, options)` returns a `plugin` (it finds the `:query`, handles the keys, replaces the query, and makes the editor a combobox while open), the `suggestions` store to render, and `anchor()`. `content(text, suggestion, schema)` inserts a node instead of text. In React, `useEmojiTypeaheadStore((store, options) => emojiTypeahead(store, options), [])` gives the same `EmojiTypeahead` as the hooks. Without a framework:

```ts
import { createEmojiStore } from "@brianhung/emoji-picker-core";
import { emojiTypeahead } from "@brianhung/emoji-picker-core/prosemirror";

const { plugin, suggestions, anchor } = emojiTypeahead(createEmojiStore({ data: "/emoji/en.json" }));
new EditorView(editor, { state: EditorState.create({ schema, plugins: [plugin, keymap(baseKeymap)] }) });

const attrs = (el: HTMLElement, props: object) => {
  for (const [name, value] of Object.entries(props)) value === undefined ? el.removeAttribute(name) : el.setAttribute(name, String(value));
  return el;
};
const list = attrs(document.body.appendChild(document.createElement("ul")), suggestions.getListProps());
list.onmousedown = (event) => event.preventDefault(); // keep the caret in the editor
suggestions.subscribe(() => {
  const { open, suggestions: items } = suggestions.getSnapshot();
  const rect = anchor();
  list.hidden = !open;
  if (rect) list.style.cssText = `position: fixed; left: ${rect.left}px; top: ${rect.bottom}px`;
  list.replaceChildren(
    ...items.map((item, i) => {
      const option = attrs(document.createElement("li"), suggestions.getOptionProps(i));
      option.textContent = `${suggestions.textFor(item)} :${item.shortcode}:`;
      option.onclick = () => suggestions.choose(i);
      return option;
    }),
  );
});
```

### Without React

The hooks are thin wrappers over stores in `@brianhung/emoji-picker-core` that any framework can drive: `subscribe`, read `getSnapshot()`, call actions, and spread the attribute getters.

```ts
import { createEmojiStore, createEmojiSuggestions, createPickerState, moveHighlight } from "@brianhung/emoji-picker-core";

const store = createEmojiStore({ data: "/emoji/en.json" });
const typeahead = createEmojiSuggestions(store, { onChoose: (s) => insert(typeahead.textFor(s)) });
typeahead.subscribe(render);
typeahead.setQuery("tada"); // from the editor's :query
input.addEventListener("keydown", (e) => typeahead.keydown(e)); // arrows, Enter/Tab, Escape; IME-safe
// typeahead.getSnapshot(): { open, suggestions, highlightedIndex, activeDescendant }
// typeahead.getInputProps(), getListProps(), getOptionProps(i): role, ids, aria-*, data-highlighted

const picker = createPickerState(store, { searchResults: "ranked" });
picker.setQuery("heart");
moveHighlight(picker, "right", { columns: 9 });
picker.choose(); // EmojiSelection of the highlighted emoji
```

The picker state owns its highlight unless you control it: pass `highlighted` and `onHighlightedChange` (as with `query` and `onQueryChange`), and `setOptions(next, { notify: true })` when your value changes.

## Rendering emoji

`<Emoji emoji={…} />` draws one emoji the way the pickers do. It accepts a native emoji, a shortcode with or without colons, a unified code, a custom emoji id, an `EmojiSelection`, an `EmojiRecord`, or a `CustomEmoji`. Unknown input renders as text with `data-emoji-missing`. `useEmoji(input)` returns the resolved emoji, and `resolveEmoji(store, input)` does the same without React. The `unified` prop is a deprecated alias of `emoji`.

`renderer="image"` draws every emoji from the provider's `imageUrl(unified)`, for example a vendor set from [emoji-datasource](https://github.com/iamcal/emoji-data) (check the set's license): `` imageUrl={(u) => `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@16.0.0/img/apple/64/${u}.png`} ``; swap `apple` for `google` or `facebook`.

### Artwork overrides

`EmojiOverrides` draws particular emoji with your own art everywhere inside it: `<Emoji>`, picker cells, search results, and tapbacks. The emoji keep their identity for selection, search, and frequents. Keys are unified codes; a base code covers every skin tone.

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

A search is a function, `(query, context) => hits | Promise<hits>`. Set it with the provider's `searchEngine`; the picker, `useEmojiSearch`, and `useEmojiSearchState` call it.

```tsx
import { fallback, lexical, preferFrequent, progressive, remote, rerank } from "@brianhung/emoji-picker-core/search";

const typoTolerant = fallback(lexical(), fuzzy); // fuzzy: any EmojiSearch, such as the Fuse.js recipe in the core README
const personal = rerank(lexical(), preferFrequent());
const semantic = progressive(lexical(), remote((query, { signal }) => fetchEmoji(query, signal)));

<EmojiProvider data={en} searchEngine={semantic}>…</EmojiProvider>
```

`context` provides `records`, `limit`, `signal` (aborted when the query changes), and `frequency(unified)`. Return `{ unified, score? }[]`, best first.

Recipes for MiniSearch, Fuse.js and FlexSearch are in the [core README](https://github.com/BrianHung/EmojiPicker/tree/main/packages/emoji-picker-core#bring-your-own-search).

| Function | Description |
|---|---|
| `lexical({ typos, typoThreshold, locale, segmenter, tokenize })` | The default. A sorted word index over shortcodes, names, and tags, with typo correction. |
| `fallback(primary, secondary, { min })` | Uses `secondary` when `primary` finds fewer than `min` results |
| `merge(...searches)` | Reciprocal rank fusion |
| `rerank(search, ...rerankers)`, `preferFrequent({ weight })` | Reorders results |
| `progressive(fast, slow)`, `withInterim(promise, hits)` | Shows fast results until slow ones arrive |
| `remote(fetcher)` | Any async source of unified codes or hits |

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

`focusModel="input"` (the default) keeps focus in the search field and moves a highlight (`aria-activedescendant`); `"grid"` moves focus into the cells. `pointerModel="follows"` (the default) makes the hovered emoji the keyboard position: the next arrow continues from it, and hover never takes focus from outside the picker; `"independent"` leaves hover as a style. Without a search field, focus is on the cells either way. The grid, the category tabs and a tapback's reactions are one tab stop each (roving tabindex). After a pick, focus and the highlight stay where they were.

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
| Skin-tone variations | Shift+Space or a long press on an emoji opens a `listbox` of its six tones (named by `labels.skinTone`, options by `labels.withSkinTone`), focused on the current tone |
| Tapback, ReactionBar | A `toolbar` with one tab stop (roving tabindex); `aria-pressed` on the user's reactions |
| EmojiPopover | Trigger with `aria-haspopup="dialog"`, `aria-expanded`, and `aria-controls`; content is a labelled, non-modal `dialog` |
| Autocomplete hooks | `combobox` and `listbox` props from `getInputProps`, `getListProps`, and `getOptionProps` |
| `Emoji` | `role="img"` named by the emoji; `decorative` hides it |

The library animates nothing itself and honors `prefers-reduced-motion`.

## Styling

Parts are unstyled. Every part and cell has a stable `data-slot`, such as `emoji-picker`, `search-input`, `category-tab`, `list`, `category-header`, and `emoji`. State appears as `data-highlighted` (the search field's highlight), `data-active`, `data-collapsed`, `data-searching`, `data-empty`, `data-disabled`, `data-has-variations`, and `data-state`, plus `data-focused`, `data-focus-visible`, `data-hovered`, `data-pressed`, and `data-selected` (as React Aria names them). A part's state uses the same names (`{ hovered, focused, focusVisible, pressed, disabled }` on its buttons and field). Repeated elements are parts in children functions (`List.Cell`, `List.SectionTitle`, `CategoryNav.Tab`, `SkinTone.Option`, `Reactions.Item`), each taking `className` as a string or a function of its state.

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

The List sets `--emoji-picker-content-width` on Root to the grid's measured width, so a footer can cap at it with `max-width: var(--emoji-picker-content-width)`.

`tokens.css` defines `--emoji-picker-*` color and shape tokens with `light-dark()` defaults. `theme.css` exposes them as Tailwind v4 utilities (`bg-picker-background`, `rounded-picker`). `shadcn.css` maps them to a shadcn/ui theme. The library injects no CSS: the layout a part needs (a cell's size from `--emoji-cell-size`, the viewport's scroll axis, sticky titles) is inline and driven by the size variables, and everything visual (the Root's column, the emoji font via `--emoji-font-family`, forced-colors outlines, reduced motion) is your classes, as in the registry item.

## Data

`data/en.json` is built from emojibase and its iamcal (Slack) shortcodes: 1,923 emoji, 1,914 with shortcodes, 192 KB (50 KB gzipped). Skin-tone variations are computed at load. The provider's `filter` removes emoji from pickers and search.

A dataset object (`import en from ".../en.json"`) is ready on the first render, so server-rendered markup has the grid. Changing `data`, `locale`, `filter`, `customEmojis` or `searchEngine` updates the provider in place, keeping frequents and skin tone; functions and objects compare by reference, so define them outside render or memoize them.

## Localization

Japanese in three lines: build the data, pass it with the locale, and translate the strings you show.

```tsx
// npx @brianhung/emoji-picker-core build-data ja --out public/emoji/ja.json
<EmojiProvider data="/emoji/ja.json" locale="ja" labels={{ searchPlaceholder: "検索", noResults: "見つかりません" }}>…</EmojiProvider>
```

`locale` is one setting for everything language-specific: case folding, word segmentation and A–Z order in search, the result count's digits and plural rules, and React Aria's text direction. Without it, the dataset's own `locale` is used. Each piece can be replaced on its own, and replacing one leaves the others on the locale: `labels` (any of `EmojiLabels`), `data` (a dataset per locale), `search` (`lexical({ segmenter, tokenize })`), `collator` (alphabetical shortcode order), and the shortcode sets (`build-data --shortcodes`). The same options work on `createEmojiStore` without React; `store.labels()` is the merged labels.

Arrow keys and the grid's layout follow React Aria's locale direction, not CSS `direction`: for right-to-left, set an RTL `locale` (or wrap the app in React Aria's `I18nProvider`) along with `<html dir="rtl">`.

The package ships English. To build a dataset for another language, run the `build-data` command with an [emojibase locale](https://emojibase.dev/docs/datasets/#supported-locales):

```bash
npm install --save-dev emojibase-data
npx @brianhung/emoji-picker-core build-data ja --out public/emoji/ja.json
```

The dataset has the locale's emoji names, tags, and category names, and the same format as `en.json`. Every locale keeps Slack's English shortcodes, so `:thumbsup:` works everywhere, followed by the locale's CLDR shortcodes (`:samuzuappu:`). Choose other emojibase sets with `--shortcodes`, for example `--shortcodes iamcal,cldr-native`.

Pass the dataset as `data`:

```tsx
<EmojiProvider data="/emoji/ja.json">…</EmojiProvider>
```

Or skip the build: `localeData(locale, { shortcodes = "iamcal", baseUrl })` returns the jsDelivr URL of that file in `@brianhung/emoji-picker-data`, at the version core was built with, or `${baseUrl}/${locale}/${shortcodes}.json` for your own copy:

```tsx
import { localeData } from "@brianhung/emoji-picker-core";

<EmojiProvider data={localeData("ja", { shortcodes: "cldr" })} locale="ja">…</EmojiProvider>
```

Search follows the dataset's `locale`: it normalizes text (NFKC, so full-width `ｆｉｒｅ` finds 🔥), lowercases by the locale's rules (Turkish `İ` becomes `i`), splits Japanese, Chinese, and Thai into words with `Intl.Segmenter`, and orders alphabetical shortcode completion with `Intl.Collator`. Set `locale` on the provider to override the dataset's tag.

To change how text becomes words, pass a `segmenter` (any object with `Intl.Segmenter`'s `segment()`) or replace the tokenizer. A tokenizer receives text and returns words; it splits both the indexed names and the query.

```tsx
import { lexical } from "@brianhung/emoji-picker-core/search";

const bigrams = (text: string) => Array.from({ length: Math.max(1, text.length - 1) }, (_, i) => text.slice(i, i + 2));

<EmojiProvider data="/emoji/zh.json" searchEngine={lexical({ tokenize: bigrams })}>…</EmojiProvider>
```

Interface strings are defined in `EmojiLabels`, exported from `@brianhung/emoji-picker-core` with English defaults in `defaultLabels`. Pass any of them as the provider's `labels`; its `locale` also sets React Aria's locale (text direction) and formats the default result count. Counts are functions; `plural()` builds one from CLDR plural forms and formats the number for the locale:

```ts
import { defaultLabels, plural, type EmojiLabels } from "@brianhung/emoji-picker-core";

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
```

Browser checks (keyboard, axe, screen readers) run against the demo site; see the [root README](../../README.md).

## License

MIT. Third-party notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
