# EmojiPicker v3 plan

Replace the 2021 `react-twemoji-picker` (react-window + a 3 MB Twemoji SVG sprite) with a headless, shadcn-style picker that has:

- An iOS-style **tapback bar** (top 5 frequent emoji) that expands into the full picker
- **Slack shortcodes** (`:thumbsup:`) in search, in pick events and as `:thu` autocomplete in text inputs
- **Skin tones**
- **Native emoji on Apple/Android, Twemoji on Windows**, in the picker *and* in message text
- **Custom emoji**
- Virtualized grid, fast search, no CDN, and a strict-CSP-safe build

## What we learned (Nov 2026)

### Libraries

| | emoji-picker-react 5.1.4 | Frimousse 0.4.0 | emoji-picker-element 1.29.1 |
|---|---|---|---|
| Headless / composable | Yes, `emoji-picker-react/primitives` (17 components, 7 hooks) | Yes (fully unstyled) | No (shadow DOM, CSS variables only) |
| Virtualization | Yes, per emoji, absolute positioning | Yes, fixed-height rows | No (issue #452 open) |
| Data | Bundled, compact (`emojis-en.json` 238 KB / 49 KB gz) | Fetched from jsDelivr, cached in localStorage | Fetched, stored in IndexedDB |
| Slack shortcodes | No (imports emoji-datasource only to filter) | No (search uses label + tags) | Yes, via the `en/iamcal` data pack |
| Custom emoji / Twemoji | Yes / yes (images via `getEmojiUrl`) | No / no (text only, by design) | Yes / font only |
| Frequent emoji | Yes, localStorage `epr_suggested` (14, with counts) | No | Yes, `getTopFavoriteEmoji(n)` |
| Maintenance | Very active (v5.0.0 on Oct 10, 2026) | Slow; PRs unreviewed | No maintainer commits since Mar 2026 |

### Benchmark: IndexedDB vs in-memory

Headless Chrome on an M-series Mac, iamcal dataset, 7 runs, 1x / 4x CPU throttle.

| | Startup | Median search | Worst p95 | "heart eyes" typed (8 keystrokes) | JS heap |
|---|---|---|---|---|---|
| IndexedDB, cold (epe `Database`) | 172 / 229 ms | 0.2 / 0.9 ms | 3.9 / 11.9 ms | 6.8 / 18.7 ms | 95 KB |
| IndexedDB, warm | **1.9 / 7.4 ms** | 0.2 / 0.9 ms | 4.5 / 11.5 ms | 4.9 / 16.4 ms | **64 KB** |
| In-memory sorted index | 16 / 59 ms | **<0.05 ms** | **0.2 / 1.2 ms** | **0.2 / 1.0 ms** | 844 KB |
| In-memory linear scan | 6.7 / 22 ms | 0.3 / 1.2 ms | 0.4 / 2.1 ms | 2.0 / 9.3 ms | 898 KB |
| In-memory, data inlined as a `JSON.parse("…")` JS module | 17 / 59 ms | <0.05 ms | 0.2 / 1.1 ms | 0.2 / 1.1 ms | **2.1 MB** |

Conclusions:
- In-memory search is 10–25x faster per query. IndexedDB's advantages are only warm startup and about 0.8 MB of JS heap, and that data still sits in the browser's storage process.
- **Build the in-memory index once, lazily, in idle time.** Keep IndexedDB as an optional adapter only.
- **Ship data as a separate hashed `.json` file.** Inlining it into JS as a string literal costs 2.5x the heap, because V8 keeps the script source.

### Data sizes

| File | Raw | gzip |
|---|---|---|
| `emojibase-data/en/shortcodes/iamcal.json` (Slack) | 48 KB | 15 KB |
| `emojibase-data/en/compact.json` | 571 KB | 83 KB |
| `emoji-picker-element-data/en/iamcal/data.json` | 433 KB | 70 KB |
| `emoji-picker-react/dist/data/emojis-en.json` | 238 KB | 49 KB |
| Old `data/twemoji.svg` sprite (1,765 emoji, 11,339 paths) | 3.0 MB | 953 KB |
| Old `data/emoji.json` | 1.85 MB | not measured |

The emoji-picker-react file breaks down as names/keywords 54%, skin-tone variation codes 24%, unified codes 12% and version 7%.

## Decision: an ergonomic layer on emoji-picker-react v5 primitives

We align on **emoji-picker-react v5** (`emoji-picker-react/primitives`) as the engine. It owns virtualization, keyboard navigation, a11y, variations, the reactions/expand mode and the search box. We wrap it in a smaller, Frimousse-style API and add the parts none of the three libraries has. The wrapper **never re-exports emoji-picker-react types**, so the engine stays swappable.

### Assessment of the v5 primitives (read from source, 5.1.4)

| Need | v5 gives us | Our layer |
|---|---|---|
| Composable, unstyled parts | `Root`, `Search`/`SearchInput`, `CategoryNav`, `Viewport`, `List`, `Preview`, `SkinTone`, `Reactions`, `Panel`, `Empty`, `Loading`, `LoadError` | Re-export as `EmojiPicker.*` with our prop names and our selection type |
| Custom cell and header markup | `components={{ Emoji, CategoryHeader, CategoryButton, SkinToneButton, ExpandButton, ClearButton }}` (spread managed props) | Pass through, typed with our own render-prop types |
| Custom data source | `emojiData` takes an object or an async loader; its search scans each emoji's `n` names | Our build emits epr-shaped data with **shortcodes added to `n`**, so picker search matches `thumbsup` without a fork |
| Custom emoji and sections | `customEmojis` `{ id, names, imgUrl, group }` plus `categories` order and names | Our `customEmojis` adds `shortcodes`; it feeds the picker *and* our index |
| Frequents | `suggestedEmojis` (an explicit list) or its own `epr_suggested` localStorage | Our pluggable frequency store, passed in as `suggestedEmojis` and `reactions` |
| Tapback | `Reactions` + `allowExpandReactions` + `usePickerMode()` | `<Tapback>`, self-filling from frequents |
| Twemoji | `emojiStyle="twitter"` + `getEmojiUrl` | `renderer="auto"`: native, or Twemoji when `needsTwemoji()` (later: a chunked font) |
| Shortcodes outside the picker | none (v5 explicitly does not promise shortcodes) | `emoji-core`: index, `:thu` autocomplete, `replaceShortcodes`, `:skin-tone-N:` |
| Arbitrary custom rows *inside* the virtualized grid | no (rows are categories) | Put rows above/below `List` (composition allows any children); custom sections come through custom-emoji groups |

**Virtualization:** keep the v5 engine for now. It skips off-screen cells and preloads only images near the viewport. It does still iterate every emoji of each visible category per render (`useEmojiVirtualization.tsx`). Milestone 5 measures scroll and open performance; we replace it with fixed-height row windowing (Frimousse's approach) only if the numbers say so.

### Public API (small on purpose)

```tsx
import { EmojiProvider, EmojiPicker, Tapback, useShortcodeAutocomplete, replaceShortcodes } from "@brianhung/emoji-picker";
import enData from "@brianhung/emoji-picker/data/en.json?url"; // separate hashed asset

<EmojiProvider data={() => fetch(enData).then((r) => r.json())} customEmojis={[...]} renderer="auto">
  <EmojiPicker.Root onSelect={(e) => insert(e.emoji)} className="h-[380px] w-[340px]">
    <EmojiPicker.Search className="..." />
    <EmojiPicker.Viewport>
      <EmojiPicker.List components={{ Emoji: MyCell }} />
      <EmojiPicker.Empty>No emoji</EmojiPicker.Empty>
      <EmojiPicker.Loading />
    </EmojiPicker.Viewport>
    <EmojiPicker.Preview />
  </EmojiPicker.Root>

  <Tapback onSelect={react} />   {/* top-5 frequents + "+" → full picker */}
</EmojiProvider>
```

- `EmojiProvider`: one shared store per app (dataset, search index, frequents, skin tone, renderer). Every picker and tapback reads from it, so there's a single index for every message's reaction button.
- `EmojiPicker.*`: thin parts over v5 primitives. `onSelect` receives **our** `EmojiSelection` type: `{ emoji, unified, baseUnified, name, shortcodes, skinTone, isCustom, imageUrl? }`.
- `Tapback`: a compact row from frequents (with defaults), expandable to the full picker.
- Hooks: `useEmojiSearch(query)`, `useShortcodeAutocomplete({ value, caret })`, `useFrequentEmoji(n)`, `useSkinTone()`.
- Pure functions (no React, server-safe): `replaceShortcodes(text)`, `toShortcodes(unified)`, `fromShortcode(code)`.
- Data: `createFrequencyStore({ storage })` for a pluggable store (localStorage default, memory, or your own server sync).

**Internal (not exported):** the epr adapter, the dataset format, the index structure, tone math, platform probes, and epr prop names and types.

### Extensibility checklist (Frimousse issue requests)

| Request | Where it lands |
|---|---|
| #2 shortcodes | Built-in (iamcal); search, selection, autocomplete |
| #4 recently/frequently used | `createFrequencyStore` → `suggestedEmojis` and `Tapback` |
| #5 custom emoji | `customEmojis` on the provider (with shortcodes and groups) |
| #6 custom renderers | `components` on Root and List |
| #7 category icons | v5 `categoryIcons`, exposed as `categories={[{ id, name, icon }]}` |
| #20 label helper | `getEmoji(unified)` from the store (name, shortcodes) |
| Custom data source | `data` = object, URL loader or a transform of our dataset |

## Architecture (single package, subpath exports)

```
src/
  core/        (no React) dataset, search-index, shortcodes, frequents, skin-tone, platform, store
  react/       provider, picker parts, tapback, hooks
  index.ts     public surface only
scripts/
  build-data.ts  emojibase-data + iamcal → data/en.json (our format) → epr EmojiData at runtime
demo/          Vite + Tailwind v4 app with a shadcn-styled example (the future registry item)
test/          Vitest unit tests for core
```

### Data format (`data/en.json`)

- One record per emoji: unified code, label, tags, shortcodes, group, version, and a skin-tone flag.
- Tone variations are **computed**. Drop the `FE0F` after the first codepoint, then insert `1F3FB`–`1F3FF` after it. The build verifies this against emojibase and stores only exceptions.
- Converted at runtime into epr `EmojiData` (`n` = tags + shortcodes + label, label last as `emojiName()` expects) and into our search index.

## Twemoji on Windows: a chunked color font (to prototype)

**Why not the old SVG sprite:** about 1 MB gzipped must download before the first emoji appears. Each `#fragment` `<img>` is likely to re-render the whole 11,339-path document (to measure). It covers only 1,765 emoji, and it can't appear inside text inputs.

**Idea:** a Twemoji COLR font served as several `@font-face` blocks with `unicode-range`. The browser downloads only the chunks for codepoints on screen, the way Google Fonts serves Noto Color Emoji. It works in message text, inputs, contenteditable and the picker, with no `<img>` and real Unicode on copy.

```css
html.twemoji { --emoji-font: "Twemoji", "Segoe UI Emoji", sans-serif; }
@font-face { font-family: "Twemoji"; src: url(/fonts/twemoji-00.woff2) format("woff2"); unicode-range: U+1F600-1F64F, U+200D, U+FE0F, U+1F3FB-1F3FF; font-display: swap; }
/* ...one block per chunk... */
```

**Risks to answer in the prototype:**
1. **Sequences across chunks.** ZWJ sequences (👨‍👩‍👧), skin-tone modifiers, flags (two regional indicators) and keycaps are GSUB ligatures. They only form if every component and the ligature glyph are in the **same** font file. Chunk by connected component of the sequence graph (union-find over codepoints that appear together). Duplicate shared joiners (U+200D, U+FE0F, U+1F3FB through U+1F3FF) into every chunk. The people/family/hand component may end up large; measure it.
2. **Font source and freshness.** Mozilla's Twemoji COLR font (`twemoji-colr`) versus building our own from the maintained `jdecked/twemoji` SVGs with Google's `nanoemoji`. Check which Emoji version each covers.
3. **Rendering on Windows.** Chrome/Edge and Firefox on Windows 10 and 11: COLRv0 versus COLRv1, small sizes, selection highlight and caret positioning in inputs.
4. **Size.** Total woff2 size and per-chunk size. The typical first view (smileys plus hearts plus thumbs) should be under about 100 KB. This is a goal; measure it.
5. **Licensing.** Twemoji graphics are CC-BY 4.0, so we need an attribution line.

**Fallback if the font fails:** per-emoji SVG images lazy-loaded for visible cells only (epr's `getEmojiUrl` plus nearby preloading), applied to the picker and tapback. Message text would keep the native Segoe UI Emoji.

## Milestones (v3 branch, local only)

1. ✅ **Data and core.** `scripts/build-data.ts`, `core/*` and Vitest tests (14 passing).
2. ✅ **React layer.** Provider, `EmojiPicker.*` parts, `Tapback`, `Emoji`, hooks.
3. ✅ **Demo site.** iMessage mockup, inline and dropdown, light and dark, native vs Twemoji, custom data/emoji/rows, headless, API table.
4. **Benchmark.** Our index vs epr search, plus picker open time, scroll and memory. Decide whether to keep v5 virtualization.
5. **Twemoji font prototype.** See above.
6. **Registry and docs.** shadcn registry item, README, migration notes from `react-twemoji-picker`.

## Verification

- Re-run the benchmark (`RUNS=7 node run.mjs`) and add Safari/WebKit and Firefox. So far only Chrome is measured.
- Measure picker open time, scroll FPS and memory against stock emoji-picker-react and Frimousse.
- Measure bundle size: picker JS gz, data gz and font chunks for the first view.
- Check shortcode correctness: every iamcal shortcode resolves, and `:thumbsup::skin-tone-3:` round-trips.
- Test on Windows (Chrome, Edge, Firefox), macOS/iOS Safari and Android Chrome.

## Open questions

- Monorepo in this repo, or a new repo?
- Should frequent-emoji counts sync to the server per user (across devices) or stay local?
- Do we need multi-person skin tones (🧑🏻‍🤝‍🧑🏿) in v1?
- Which locales beyond `en` are needed at launch?
