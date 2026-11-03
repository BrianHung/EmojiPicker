// Examples, Base UI style: an h3, one sentence, a live preview, and its code.
import * as React from "react";
import { usePickedEmoji } from "@/components/site/picked";
import Fuse from "fuse.js";
import enUrl from "@brianhung/emoji-picker/data/en.json?url";
import {
  Emoji,
  EmojiOverrides,
  EmojiProvider,
  useEmojiSearch,
  useEmojiStore,
  useFrequentEmoji,
  type CategoryOption,
  type EmojiCellProps,
  type EmojiSearch,
  type EmojiSelection,
  type Renderer,
  type SearchResultsMode,
} from "@brianhung/emoji-picker";
import { fallback, fuse, lexical, preferFrequent, remote, rerank } from "@brianhung/emoji-picker/search";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmojiAutocomplete, useAutocompleteInput } from "@/components/emoji-autocomplete";
import { EmojiPickerPopover, EmojiPickerCard, EmojiTapback } from "@/registry/emoji-picker";
import { Example, H2, P } from "@/components/site/docs";
import { InlinePicker as InlineTailwind } from "@/components/demos/inline-picker/tailwind";
import { InlinePicker as InlineModules } from "@/components/demos/inline-picker/css-modules";
import { ReactionBar as TapbackTailwind } from "@/components/demos/tapback/tailwind";
import { ReactionBar as TapbackModules } from "@/components/demos/tapback/css-modules";
import inlineTailwindSource from "@/components/demos/inline-picker/tailwind.tsx?raw";
import inlineModulesSource from "@/components/demos/inline-picker/css-modules/index.tsx?raw";
import inlineModulesCss from "@/components/demos/inline-picker/css-modules/index.module.css?raw";
import tapbackTailwindSource from "@/components/demos/tapback/tailwind.tsx?raw";
import tapbackModulesSource from "@/components/demos/tapback/css-modules/index.tsx?raw";
import tapbackModulesCss from "@/components/demos/tapback/css-modules/index.module.css?raw";
import { BUFO_PACK_URL } from "@/lib/packs";


function Chips<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as T)}>
      <TabsList aria-label={label} className="max-w-full flex-wrap">
        {options.map(([v, text]) => (
          <TabsTrigger key={v} value={v}>
            {text}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/* ------------------------------------------------------------------ inline */

/** Tailwind and CSS Modules tabs over the same component, as Base UI shows them. */
const variantsCode = (tailwind: string, tsx: string, css: string) => [
  { label: "Tailwind", file: "index.tsx", code: tailwind },
  {
    label: "CSS Modules",
    files: [
      { name: "index.tsx", code: tsx },
      { name: "index.module.css", code: css, lang: "css" as const },
    ],
  },
];

function InlineExample() {
  const [picked, setPicked] = usePickedEmoji();
  const preview = (picker: React.ReactNode) => (
    <div className="flex w-full flex-col items-center gap-3">
      {picker}
    </div>
  );
  return (
    <Example
      id="inline"
      title="Inline"
      description="A picker placed in the page."
      code={variantsCode(inlineTailwindSource, inlineModulesSource, inlineModulesCss)}
      variants={{ Tailwind: preview(<InlineTailwind onSelect={setPicked} />), "CSS Modules": preview(<InlineModules onSelect={setPicked} />) }}
    />
  );
}

/* ---------------------------------------------------------------- popover */

const POPOVER_TW = `import { EmojiPicker, EmojiPopover } from "@brianhung/emoji-picker";
import { Button } from "@/components/ui/button";

<EmojiPopover.Root>
  <EmojiPopover.Trigger asChild>
    <Button variant="outline" className="rounded-full">🙂 Add reaction</Button>
  </EmojiPopover.Trigger>
  <EmojiPopover.Content side="bottom" align="start" className="z-50">
    <EmojiPicker.Root onSelect={(e) => react(e.unified)} className="h-[380px] w-[352px] rounded-xl border bg-popover shadow-md">
      …
    </EmojiPicker.Root>
  </EmojiPopover.Content>
</EmojiPopover.Root>`;

const POPOVER_TSX = `import { EmojiPicker, EmojiPopover } from "@brianhung/emoji-picker";
import styles from "./index.module.css";

<EmojiPopover.Root>
  <EmojiPopover.Trigger className={styles.trigger}>🙂 Add reaction</EmojiPopover.Trigger>
  <EmojiPopover.Content side="bottom" align="start" className={styles.content}>
    <EmojiPicker.Root onSelect={(e) => react(e.unified)} className={styles.picker}>
      …
    </EmojiPicker.Root>
  </EmojiPopover.Content>
</EmojiPopover.Root>`;

const POPOVER_CSS = `.trigger {
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--emoji-picker-border);
  border-radius: 8px;
}
.trigger[aria-expanded="true"] {
  background: var(--emoji-picker-hover);
}
.content {
  z-index: 50;
}
.picker {
  width: 352px;
  height: 380px;
  background: var(--emoji-picker-background);
  border: 1px solid var(--emoji-picker-border);
  border-radius: var(--emoji-picker-radius);
  box-shadow: var(--emoji-picker-shadow);
}`;

function PopoverExample() {
  const [picked, setPicked] = usePickedEmoji();
  return (
    <Example
      id="popover"
      title="Popover"
      description="A picker that opens from a trigger and closes on selection."
      previewClassName="min-h-[180px] flex-col gap-3"
      code={[
        { label: "Tailwind", file: "index.tsx", code: POPOVER_TW },
        {
          label: "CSS Modules",
          files: [
            { name: "index.tsx", code: POPOVER_TSX },
            { name: "index.module.css", code: POPOVER_CSS, lang: "css" },
          ],
        },
      ]}
    >
      <EmojiPickerPopover onSelect={setPicked} triggerClassName="h-10 rounded-full border border-border px-4 active:scale-[0.97] transition-transform">
        <span className="text-base">{picked?.emoji || "🙂"}</span> Add reaction
      </EmojiPickerPopover>
    </Example>
  );
}

/* ---------------------------------------------------------------- tapback */

function TapbackExample() {
  const [picked, setPicked] = usePickedEmoji();
  const preview = (bar: React.ReactNode) => (
    <div className="flex w-full flex-col items-center gap-3">
      {bar}
    </div>
  );
  return (
    <Example
      id="tapback"
      title="Tapback"
      description="A row of the most-used emoji with a button that expands into the full picker."
      // Collapsed, the 54px bar sits centered in the Popover example's 180px; expanded, the preview grows downward under it.
      previewClassName="min-h-[180px] items-start pt-[62px] sm:pt-[62px]"
      code={variantsCode(tapbackTailwindSource, tapbackModulesSource, tapbackModulesCss)}
      variants={{ Tailwind: preview(<TapbackTailwind onSelect={setPicked} />), "CSS Modules": preview(<TapbackModules onSelect={setPicked} />) }}
    />
  );
}

/* ----------------------------------------------------------------- search */

/** A stand-in endpoint: the lexical search behind 400 ms of latency, honoring the abort signal. */
const slowEndpoint: EmojiSearch = remote(
  (query, context) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(lexical()(query, context) as never), 400);
      context.signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("aborted", "AbortError"));
      });
    }),
);

const ENGINES = {
  default: { label: "lexical()", note: "Matches shortcodes, then names, then tags, with typo correction.", search: lexical(), code: `<EmojiProvider data={en}>` },
  exact: { label: "No typos", note: "Matches exact words only.", search: lexical({ typos: false }), code: `<EmojiProvider data={en} search={lexical({ typos: false })}>` },
  fuse: {
    label: "+ Fuse",
    note: "Runs Fuse.js when lexical() returns fewer than 8 results.",
    search: fallback(lexical(), fuse(Fuse)),
    code: `import Fuse from "fuse.js";
import { fallback, fuse, lexical } from "@brianhung/emoji-picker/search";

<EmojiProvider data={en} search={fallback(lexical(), fuse(Fuse))}>`,
  },
  frequent: { label: "+ Frequents", note: "Ranks frequently used emoji higher.", search: rerank(lexical(), preferFrequent({ weight: 0.6 })), code: `<EmojiProvider data={en} search={rerank(lexical(), preferFrequent({ weight: 0.6 }))}>` },
  remote: {
    label: "Async",
    note: "Calls an async source and aborts stale requests.",
    search: slowEndpoint,
    code: `import { remote } from "@brianhung/emoji-picker/search";

const search = remote((query, { signal }) =>
  fetch(\`/api/emoji?q=\${encodeURIComponent(query)}\`, { signal }).then((r) => r.json()),
);

<EmojiProvider data={en} search={search}>`,
  },
} satisfies Record<string, { label: string; note: string; search: EmojiSearch; code: string }>;
type EngineId = keyof typeof ENGINES;

function SearchExample() {
  const [engine, setEngine] = React.useState<EngineId>("default");
  const [mode, setMode] = React.useState<SearchResultsMode>("ranked");
  const [picked, setPicked] = usePickedEmoji();
  // Starts empty: a query on mount highlights the first result, and its scrollIntoView would scroll the page here.
  const [query, setQuery] = React.useState("");
  const current = ENGINES[engine];
  return (
    <Example
      id="search"
      title="Search"
      description="A replaceable search function, with results ranked or grouped."
      previewClassName="flex-col gap-3"
      code={[
        { label: "Provider", file: "providers.tsx", code: current.code },
        {
          label: "EmojiSearch",
          file: "search.ts",
          code: `type EmojiSearch = (query: string, context: {
  records: EmojiRecord[];
  limit: number;
  signal: AbortSignal;
  frequency(unified: string): number;
}) => SearchHit[] | Promise<SearchHit[]>;`,
        },
      ]}
    >
      <Chips label="Search engine" value={engine} onChange={setEngine} options={Object.entries(ENGINES).map(([id, e]) => [id as EngineId, e.label])} />
      <Chips label="Results" value={mode} onChange={setMode} options={[["ranked", "Ranked"], ["grouped", "Grouped"]]} />
      {/* Remount per engine: provider options are read once, like a store. */}
      <EmojiProvider key={engine} data={enUrl} search={current.search}>
        <EmojiPickerCard autoFocusSearch={false} onSelect={setPicked} searchResults={mode} search={query} onSearchChange={setQuery} />
      </EmojiProvider>
    </Example>
  );
}

/* -------------------------------------------------------------- rendering */

// Original art, drawn for this page: a glossy heart and a thumbs up.
const svg = (body: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body}</svg>`)}`;

const HEART = svg(
  `<defs><radialGradient id="h" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#ff8a9b"/><stop offset=".55" stop-color="#f2294b"/><stop offset="1" stop-color="#a50d2a"/></radialGradient></defs>` +
    `<path d="M32 57C13 44 4 33 4 21 4 11.6 11.2 5 19.5 5 25 5 29.4 8 32 12.6 34.6 8 39 5 44.5 5 52.8 5 60 11.6 60 21 60 33 51 44 32 57Z" fill="url(#h)"/>` +
    `<ellipse cx="19" cy="17" rx="8" ry="5" transform="rotate(-30 19 17)" fill="#fff" opacity=".6"/>`,
);

const THUMBS_UP = svg(
  `<defs><linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd96a"/><stop offset="1" stop-color="#f0a020"/></linearGradient></defs>` +
    `<rect x="6" y="28" width="12" height="28" rx="3" fill="#3f73d9"/>` +
    `<path d="M22 30 31 9c1.6-3.7 8-2.6 7.6 2.2L37 26h15c3.4 0 5.8 3.2 5 6.4l-4.6 18.4A7 7 0 0 1 45.6 56H26a4 4 0 0 1-4-4Z" fill="url(#t)" stroke="#c27a12" stroke-width="2" stroke-linejoin="round"/>` +
    `<path d="M38 36h17M37 43h15M36 50h13" stroke="#c27a12" stroke-width="2" stroke-linecap="round" opacity=".7"/>`,
);

const ARTWORK = { "2764-fe0f": HEART, "1f44d": THUMBS_UP };

const RENDERING_CODE = {
  renderer: (renderer: string) => `<EmojiProvider data={en} renderer="${renderer}">
  …
</EmojiProvider>`,
  artwork: `import { EmojiOverrides } from "@brianhung/emoji-picker";

const artwork = {
  "2764-fe0f": "/reactions/heart.svg",
  "1f44d": "/reactions/thumbs-up.svg", // every skin tone
};

<EmojiOverrides artwork={artwork}>
  <Tapback onSelect={(e) => react(message.id, e.unified)} />
</EmojiOverrides>

// Or on one picker:
<EmojiPicker.Root artwork={artwork}>…</EmojiPicker.Root>`,
};

function RenderingExample() {
  const [renderer, setRenderer] = React.useState<Renderer | "auto">("auto");
  const [custom, setCustom] = React.useState(true);
  const [, setPicked] = usePickedEmoji();
  const body = (
    <div className="flex flex-col items-center gap-4">
      <EmojiTapback onSelect={setPicked} />
      <EmojiPickerCard autoFocusSearch={false} footer={false} onSelect={setPicked} className="h-[300px]" />
    </div>
  );
  return (
    <Example
      id="rendering"
      title="Rendering"
      description="The provider draws emoji with the system font or Twemoji. Artwork replaces particular emoji with your own images; they keep their name, shortcode and selection."
      previewClassName="flex-col gap-4"
      code={[
        { label: "Renderer", file: "providers.tsx", code: RENDERING_CODE.renderer(renderer) },
        { label: "Artwork", file: "reactions.tsx", code: RENDERING_CODE.artwork },
      ]}
    >
      {/* The old Renderers example's anchor. */}
      <span id="renderers" className="sr-only scroll-mt-20" aria-hidden />
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
        <Chips label="Renderer" value={renderer} onChange={setRenderer} options={[["auto", "Auto"], ["native", "Native"], ["twemoji", "Twemoji"]]} />
        <Label className="flex items-center gap-2 text-sm font-normal">
          <Checkbox checked={custom} onCheckedChange={(checked) => setCustom(checked)} />
          Custom ❤️ and 👍
        </Label>
      </div>
      <EmojiProvider data={enUrl} renderer={renderer}>
        {custom ? <EmojiOverrides artwork={ARTWORK}>{body}</EmojiOverrides> : body}
      </EmojiProvider>
    </Example>
  );
}

/* ----------------------------------------------------------- custom emoji */

const CUSTOM_CATEGORIES: CategoryOption[] = [
  { id: "suggested", name: "Frequently used" },
  { id: "custom:Bufo", name: "Bufo" },
  { id: "smileys_people" },
  { id: "animals_nature" },
  { id: "food_drink" },
  { id: "activities" },
  { id: "objects" },
  { id: "symbols" },
];

function CustomEmojiExample() {
  const [picked, setPicked] = usePickedEmoji();
  return (
    <Example
      id="custom-emoji"
      title="Custom emoji"
      description={
"Image emoji with shortcodes, in their own sections."
      }
      previewClassName="flex-col gap-3"
      code={[
        {
          label: "app.tsx",
          code: `<EmojiProvider data={en} customEmojis="/packs/bufo/pack.json">
  <EmojiPicker.Root categories={[{ id: "custom:Bufo" }, { id: "smileys_people" }]}>
    …
  </EmojiPicker.Root>
</EmojiProvider>`,
        },
      ]}
    >
      <EmojiProvider data={enUrl} customEmojis={BUFO_PACK_URL}>
        <EmojiPickerCard autoFocusSearch={false} onSelect={setPicked} categories={CUSTOM_CATEGORIES} />
      </EmojiProvider>
    </Example>
  );
}

/* ------------------------------------------------- custom cells and rows */

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
            <Emoji emoji={store.withSkinTone(u)} size={22} />
          </button>
        ))}
      </div>
    </div>
  );
}

function RoundCell({ emoji, children, className, ...props }: EmojiCellProps) {
  return (
    <button
      {...props}
      title={`:${emoji.names[0]}:`}
      className={cn("flex items-center justify-center rounded-full leading-none outline-none transition-transform hover:scale-125 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-[highlighted]:bg-accent", className)}
    >
      {children}
    </button>
  );
}

const ROWS_TW = `function QuickRow() {
  const store = useEmojiStore();
  const top = useFrequentEmoji(8);
  return (
    <div className="flex justify-between border-b px-2 pb-2">
      {top.map((u) => (
        <button key={u} onClick={() => onPick(store.select(store.withSkinTone(u)))}>
          <Emoji emoji={store.withSkinTone(u)} />
        </button>
      ))}
    </div>
  );
}

function RoundCell({ emoji, children, className, ...props }: EmojiCellProps) {
  return <button {...props} className={cn("rounded-full hover:scale-125", className)}>{children}</button>;
}

<EmojiPicker.Root columns={7} frequent={false}>
  <EmojiPicker.Search />
  <QuickRow />
  <EmojiPicker.Viewport>
    <EmojiPicker.List components={{ Emoji: RoundCell, CategoryHeader: MyHeader }} />
  </EmojiPicker.Viewport>
</EmojiPicker.Root>`;

const ROWS_TSX = `import styles from "./index.module.css";

<EmojiPicker.Root columns={7} frequent={false} className={styles.root}>
  <EmojiPicker.Search />
  <QuickRow />
  <EmojiPicker.Viewport>
    <EmojiPicker.List cellClassName={styles.cell} />
  </EmojiPicker.Viewport>
</EmojiPicker.Root>`;

const ROWS_CSS = `.root {
  --emoji-size: 26px;
  --emoji-cell-size: 44px;
}
.cell {
  border-radius: 9999px;
  transition: transform 150ms;
}
.cell:hover {
  transform: scale(1.25);
  background: var(--emoji-picker-hover);
}
.cell[data-highlighted] {
  background: var(--emoji-picker-selected);
}
.cell[data-has-variations]::after {
  content: "";
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--emoji-picker-subtle);
}`;

function RowsExample() {
  const [picked, setPicked] = usePickedEmoji();
  return (
    <Example
      id="custom-cells-and-rows"
      title="Custom cells and rows"
      description="Replace the cell and header components, and add rows of your own around the grid."
      previewClassName="flex-col gap-3"
      code={[
        { label: "Tailwind", file: "index.tsx", code: ROWS_TW },
        {
          label: "CSS Modules",
          files: [
            { name: "index.tsx", code: ROWS_TSX },
            { name: "index.module.css", code: ROWS_CSS, lang: "css" },
          ],
        },
      ]}
    >
      {/* The old Rows and cells example's anchor. */}
      <span id="rows-and-cells" className="sr-only" aria-hidden />
      <EmojiPickerCard autoFocusSearch={false} onSelect={setPicked} rows={<QuickRow onPick={setPicked} />} components={{ Emoji: RoundCell }} columns={7} frequent={false} className="h-[420px] [--emoji-cell-size:44px] [--emoji-size:26px]" />
    </Example>
  );
}

/* --------------------------------------------------------------- headless */

function CommandPalette() {
  const [query, setQuery] = React.useState("party");
  const results = useEmojiSearch(query, { limit: 24 });
  const [copied, setCopied] = React.useState<string | null>(null);
  const store = useEmojiStore();
  return (
    <div className="w-full max-w-[352px] overflow-hidden rounded-xl border border-border bg-popover shadow-md">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search emoji"
        placeholder="Search by name, tag or :shortcode"
        className="h-11 w-full border-b border-border bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
      />
      <ul className="max-h-56 overflow-y-auto p-1">
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
              <Emoji emoji={r.unified} size={20} className="text-xl" />
              <span className="flex-1 truncate">{r.name}</span>
              {r.shortcodes[0] ? <code className="font-mono text-xs text-muted-foreground">:{r.shortcodes[0]}:</code> : null}
            </button>
          </li>
        ))}
        {!results.length ? <li className="px-3 py-6 text-center text-sm text-muted-foreground">No results</li> : null}
      </ul>
      <div className="h-8 border-t border-border px-3 text-xs leading-8 text-muted-foreground">{copied ? `Copied ${copied}` : `${results.length} results`}</div>
    </div>
  );
}

function Composer() {
  const { autocomplete, inputProps } = useAutocompleteInput<HTMLInputElement>({ insert: "emoji", limit: 6 });
  return (
    <div className="relative w-full max-w-[352px]">
      <EmojiAutocomplete autocomplete={autocomplete} className="absolute inset-x-0 bottom-full mb-1.5" />
      <input
        {...inputProps}
        aria-label="Message"
        placeholder="Type :tada or :thu"
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
        onKeyDown={(e) => autocomplete.onKeyDown(e)}
      />
    </div>
  );
}

function HeadlessExample() {
  return (
    <Example
      id="headless"
      title="Autocomplete"
      description="Shortcode autocomplete and search without a picker."
      previewClassName="flex-col items-center gap-10 pt-48"
      code={[
        {
          label: "Autocomplete",
          file: "composer.tsx",
          code: `const ac = useShortcodeAutocomplete({
  value, caret,
  insert: "emoji",
  onChoose: ({ value, caret }) => setText(value, caret),
});

<textarea {...ac.getInputProps()} onKeyDown={(e) => ac.onKeyDown(e) || onKey(e)} />
{ac.open && (
  <ul {...ac.getListProps()} className="rounded-lg border bg-popover p-1">
    {ac.suggestions.map((s, i) => (
      <li key={s.shortcode} {...ac.getOptionProps(i)} className="data-[highlighted]:bg-accent">
        <Emoji emoji={s.record.unified} /> :{s.shortcode}:
      </li>
    ))}
  </ul>
)}`,
        },
        {
          label: "Search",
          file: "palette.tsx",
          code: `const results = useEmojiSearch(query, { limit: 24 });

const text = useEmojiStore().replaceShortcodes(":tada: :+1::skin-tone-3:");`,
        },
      ]}
    >
      <Composer />
      <CommandPalette />
    </Example>
  );
}

/* ------------------------------------------------------------------ apps */

export function Examples() {
  return (
    <section className="flex flex-col gap-14">
      <div className="flex flex-col gap-3">
        <H2 id="examples">Examples</H2>
        <P>Live examples built from the registry component and the parts.</P>
      </div>
      <InlineExample />
      <PopoverExample />
      <TapbackExample />
      <SearchExample />
      <RenderingExample />
      <CustomEmojiExample />
      <RowsExample />
      <HeadlessExample />
    </section>
  );
}
