import * as React from "react";
import enUrl from "@brianhung/emoji-picker/data/en.json?url";
import {
  Emoji,
  EmojiPicker,
  EmojiProvider,
  useEmojiSearch,
  useEmojiStore,
  useFrequentEmoji,
  type CategoryOption,
  type EmojiCellProps,
  type EmojiSelection,
} from "@brianhung/emoji-picker";
import { Code, Demo, cn } from "../components/code";
import { ShadcnEmojiPicker } from "../components/emoji-picker";
import { TEAM_EMOJI } from "../lib/custom-emoji";

const CUSTOM_CATEGORIES: CategoryOption[] = [
  { id: "suggested", name: "Frequently used" },
  { id: "custom:Team", name: "Team" },
  { id: "custom:Status", name: "Status" },
  { id: "smileys_people" },
  { id: "animals_nature" },
  { id: "food_drink" },
  { id: "activities" },
  { id: "objects" },
  { id: "symbols" },
];

function Picked({ selection }: { selection: EmojiSelection | null }) {
  return (
    <p className="h-5 text-xs text-muted-foreground">
      {selection ? (
        <>
          picked {selection.imageUrl ? <img src={selection.imageUrl} alt="" className="inline size-4 align-[-3px]" /> : <span className="text-base">{selection.emoji}</span>}{" "}
          <code>{selection.shortcode ?? selection.unified}</code> {selection.isCustom ? "(custom)" : null}
        </>
      ) : (
        "nothing picked yet"
      )}
    </p>
  );
}

export function DataSources() {
  const [hideFlags, setHideFlags] = React.useState(true);
  const [picked, setPicked] = React.useState<EmojiSelection | null>(null);
  return (
    <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
      <Demo className="flex-col gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hideFlags} onChange={(e) => setHideFlags(e.target.checked)} /> <code>filter</code>: hide flags and emoji newer than 15.0
        </label>
        <EmojiProvider key={String(hideFlags)} data={enUrl} filter={hideFlags ? (e) => e.group !== "flags" && e.version <= 15 : undefined}>
          <ShadcnEmojiPicker onSelect={setPicked} footer={false} />
        </EmojiProvider>
        <Picked selection={picked} />
      </Demo>
      <div className="flex flex-col gap-3">
        <Code>{`// 1. A URL (fetched once, low priority, cached by the browser)
import enUrl from "@brianhung/emoji-picker/data/en.json?url";
<EmojiProvider data={enUrl}>

// 2. A loader: your CDN, IndexedDB, a locale switch…
<EmojiProvider data={({ signal }) => fetch(\`/emoji/\${locale}.json\`, { signal }).then((r) => r.json())}>

// 3. An object you built yourself (same Dataset shape)
<EmojiProvider data={myDataset}>

// Trim what shows in the picker and in search
<EmojiProvider data={enUrl} filter={(e) => e.group !== "flags" && e.version <= 15}>`}</Code>
        <Code title="build your own dataset" lang="bash">{`# emojibase-data + iamcal (Slack) shortcodes → data/<locale>.json
npx tsx scripts/build-data.ts fr`}</Code>
      </div>
    </div>
  );
}

export function CustomEmojiDemo() {
  const [picked, setPicked] = React.useState<EmojiSelection | null>(null);
  return (
    <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
      <Demo className="flex-col gap-3">
        <EmojiProvider data={enUrl} customEmojis={TEAM_EMOJI}>
          <ShadcnEmojiPicker onSelect={setPicked} categories={CUSTOM_CATEGORIES} />
        </EmojiProvider>
        <Picked selection={picked} />
      </Demo>
      <Code>{`const customEmojis = [
  { id: "lgtm", name: "looks good to me", imageUrl: "/emoji/lgtm.png", shortcodes: ["lgtm"], group: "Team" },
  { id: "ooo", name: "out of office", imageUrl: "/emoji/ooo.png", shortcodes: ["ooo"], group: "Status" },
];

<EmojiProvider data={enUrl} customEmojis={customEmojis}>
  <EmojiPicker.Root
    categories={[
      { id: "suggested", name: "Frequently used" },
      { id: "custom:Team" },          // one section per group
      { id: "custom:Status" },
      { id: "smileys_people" },       // built-ins, in your order
      { id: "objects", icon: <BoxIcon /> },
    ]}
  >…</EmojiPicker.Root>
</EmojiProvider>

// Custom emoji are searchable (:lgtm) and work in autocomplete.`}</Code>
    </div>
  );
}

/** A custom row above the grid, built from public hooks. */
function QuickRow({ onPick }: { onPick: (s: EmojiSelection) => void }) {
  const store = useEmojiStore();
  const top = useFrequentEmoji(8);
  return (
    <div className="flex flex-col gap-1 border-b border-border px-2 pb-2">
      <div className="px-1 text-xs font-medium text-muted-foreground">Quick reactions</div>
      <div className="flex justify-between">
        {top.map((u) => (
          <button
            key={u}
            type="button"
            className="flex size-9 items-center justify-center rounded-full text-[22px] hover:bg-accent"
            onClick={() => {
              const s = store.select(store.withSkinTone(u));
              if (s) onPick(s);
            }}
          >
            <Emoji unified={store.withSkinTone(u)} size={22} />
          </button>
        ))}
      </div>
    </div>
  );
}

/** A custom cell: round, bigger, with a native tooltip from the shared data. */
function RoundCell({ emoji, children, className, ...props }: EmojiCellProps) {
  return (
    <button
      {...props}
      title={`:${emoji.names[0]}:`}
      className={cn(
        "flex items-center justify-center rounded-full text-[26px] leading-none outline-none transition-transform",
        "hover:scale-125 hover:bg-accent data-[highlighted]:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function CustomRows() {
  const [picked, setPicked] = React.useState<EmojiSelection | null>(null);
  return (
    <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
      <Demo className="flex-col gap-3">
        <ShadcnEmojiPicker onSelect={setPicked} rows={<QuickRow onPick={setPicked} />} components={{ Emoji: RoundCell }} columns={7} frequent={false} className="h-[420px]" />
        <Picked selection={picked} />
      </Demo>
      <Code>{`function QuickRow() {
  const store = useEmojiStore();
  const top = useFrequentEmoji(8);
  return (
    <div className="flex justify-between border-b px-2 pb-2">
      {top.map((u) => (
        <button key={u} onClick={() => onPick(store.select(store.withSkinTone(u)))}>
          <Emoji unified={store.withSkinTone(u)} />
        </button>
      ))}
    </div>
  );
}

function RoundCell({ emoji, children, className, ...props }: EmojiCellProps) {
  // spread props: they carry the virtualized position, ref and keyboard state
  return <button {...props} className={cn("rounded-full hover:scale-125", className)}>{children}</button>;
}

<EmojiPicker.Root columns={7} frequent={false}>
  <EmojiPicker.Search />
  <QuickRow />                                  {/* any row, anywhere */}
  <EmojiPicker.Viewport>
    <EmojiPicker.List components={{ Emoji: RoundCell, CategoryHeader: MyHeader }} />
  </EmojiPicker.Viewport>
</EmojiPicker.Root>`}</Code>
    </div>
  );
}

function CommandPalette() {
  const [query, setQuery] = React.useState("party");
  const results = useEmojiSearch(query, { limit: 24 });
  const store = useEmojiStore();
  const [copied, setCopied] = React.useState<string | null>(null);
  return (
    <div className="w-full max-w-[352px] overflow-hidden rounded-xl border border-border bg-popover shadow-md">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search emoji"
        placeholder="Search by name, tag or :shortcode"
        className="h-11 w-full border-b border-border bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
      />
      <ul className="max-h-64 overflow-y-auto p-1">
        {results.map((r) => (
          <li key={r.unified}>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => {
                const s = store.select(r.unified);
                if (s?.emoji) navigator.clipboard?.writeText(s.emoji);
                setCopied(r.name);
              }}
            >
              <Emoji unified={r.unified} size={20} className="text-xl" />
              <span className="flex-1 truncate">{r.name}</span>
              {r.shortcodes[0] ? <code className="text-xs text-muted-foreground">:{r.shortcodes[0]}:</code> : null}
            </button>
          </li>
        ))}
        {!results.length ? <li className="px-3 py-6 text-center text-sm text-muted-foreground">No results</li> : null}
      </ul>
      <div className="h-8 border-t border-border px-3 text-xs leading-8 text-muted-foreground">{copied ? `copied ${copied}` : `${results.length} results`}</div>
    </div>
  );
}

export function Headless() {
  return (
    <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
      <Demo>
        <CommandPalette />
      </Demo>
      <div className="flex flex-col gap-3">
        <Code title="1 · picker search, your input">{`// The picker's search is headless too: bring any input (shadcn <Input>),
// or drive it from your own controls.
<EmojiPicker.Root>
  <EmojiPicker.SearchInput as={Input} placeholder="Search emoji" />
  <EmojiPicker.Viewport><EmojiPicker.List /></EmojiPicker.Viewport>
</EmojiPicker.Root>

const { setValue, clear } = EmojiPicker.useSearchActions();   // e.g. category chips
const { search, resultCount } = EmojiPicker.useSearchState();`}</Code>
        <Code title="2 · search without a picker">{`// Same index, ranked: shortcode > name > tag. Matches Slack codes (:tada:).
const results = useEmojiSearch(query, { limit: 24 });`}</Code>
        <Code title="3 · :shortcode: autocomplete (Slack / iMessage composers)">{`const ac = useShortcodeAutocomplete({
  value, caret,
  insert: "shortcode",            // Slack keeps :tada: as text; "emoji" inserts 🎉
  onChoose: ({ value, caret }) => setText(value, caret),
});

<textarea {...ac.getInputProps()} onKeyDown={(e) => ac.onKeyDown(e) || onKey(e)} />
{ac.open && (
  <ul {...ac.getListProps()} className="rounded-lg border bg-popover p-1">
    {ac.suggestions.map((s, i) => (
      <li key={s.shortcode} {...ac.getOptionProps(i)} className="data-[highlighted]:bg-accent">
        <Emoji unified={s.record.unified} /> :{s.shortcode}:
      </li>
    ))}
  </ul>
)}

// On send: ":tada: :+1::skin-tone-3:" → "🎉 👍🏼"
store.replaceShortcodes(text);`}</Code>
      </div>
    </div>
  );
}

export function ApiReference() {
  const rows: [string, string][] = [
    ["<EmojiProvider>", "data, customEmojis, filter, frequents, renderer, twemojiBaseUrl, defaultSkinTone, labels, prepare"],
    ["<EmojiPicker.Root>", "onSelect, columns, categories, frequent, search / defaultSearch / onSearchChange, keepSearchFocus, disableVariations, components, colorScheme, cssLayer (default \"base\")"],
    ["EmojiPicker parts", "Search, SearchInput, CategoryNav, Viewport, List, Preview, SkinTone, Empty, Loading, LoadError"],
    ["<Tapback>", "onSelect, count, collapseOnSelect, expandable, reactionsClassName, children (expanded picker)"],
    ["<Emoji>", "unified, size: renders native, Twemoji or a custom image, matching the pickers"],
    ["Hooks", "useEmojiSearch, useShortcodeAutocomplete, useFrequentEmoji, useSkinTone, useEmojiStatus, useEmojiStore, EmojiPicker.useActiveEmoji"],
    ["Store", "select, get, search, completeShortcode, replaceShortcodes, withSkinTone, setSkinTone, prepare"],
    ["EmojiSelection", "emoji, unified, baseUnified, name, shortcode (:+1::skin-tone-4:), shortcodes, skinTone, isCustom, imageUrl"],
  ];
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([name, value]) => (
            <tr key={name} className="border-b border-border last:border-0">
              <td className="w-48 py-2.5 pr-4 pl-4 align-top font-mono text-xs whitespace-nowrap">{name}</td>
              <td className="py-2.5 pr-4 text-muted-foreground">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

