import * as React from "react";
import Fuse from "fuse.js";
import enUrl from "@brianhung/emoji-picker/data/en.json?url";
import { EmojiProvider, type EmojiSearch, type EmojiSelection, type SearchResultsMode } from "@brianhung/emoji-picker";
import { fallback, fuse, lexical, preferFrequent, remote, rerank } from "@brianhung/emoji-picker/search";
import { Code, Demo, cn } from "../components/code";
import { ShadcnEmojiPicker } from "../components/emoji-picker";
import { TEAM_EMOJI } from "../lib/custom-emoji";

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
  default: {
    label: "lexical()",
    note: "The default. Shortcode > name > tag, prefix matching, typo correction. ~0.04 ms.",
    search: lexical(),
    code: `<EmojiProvider data={en}>                  // search defaults to lexical()`,
  },
  exact: {
    label: "no typos",
    note: "lexical({ typos: false }): exact words only. Try “rokcet”.",
    search: lexical({ typos: false }),
    code: `<EmojiProvider data={en} search={lexical({ typos: false })}>`,
  },
  fuse: {
    label: "+ Fuse",
    note: "Lexical first; Fuse.js only when it finds fewer than 8. Best on heavy misspellings.",
    search: fallback(lexical(), fuse(Fuse)),
    code: `import Fuse from "fuse.js";
import { fallback, fuse, lexical } from "@brianhung/emoji-picker/search";

<EmojiProvider data={en} search={fallback(lexical(), fuse(Fuse))}>`,
  },
  frequent: {
    label: "+ frequents",
    note: "Your most-used emoji move up within the results.",
    search: rerank(lexical(), preferFrequent({ weight: 0.6 })),
    code: `<EmojiProvider data={en} search={rerank(lexical(), preferFrequent({ weight: 0.6 }))}>`,
  },
  remote: {
    label: "remote (400 ms)",
    note: "Any async source: your endpoint, embeddings, a classifier. Results stay on screen until the next answer; a newer query aborts the older request.",
    search: slowEndpoint,
    code: `import { remote } from "@brianhung/emoji-picker/search";

const search = remote((query, { signal }) =>
  fetch(\`/api/emoji?q=\${encodeURIComponent(query)}\`, { signal }).then((r) => r.json()) // ["1f525", …]
);

<EmojiProvider data={en} search={search}>`,
  },
} satisfies Record<string, { label: string; note: string; search: EmojiSearch; code: string }>;
type EngineId = keyof typeof ENGINES;

function Toggle<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1">
      {options.map(([v, text]) => (
        <button
          key={v}
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn("rounded-full border px-2.5 py-0.5 text-xs transition-colors", value === v ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground")}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function SearchDemo() {
  const [engine, setEngine] = React.useState<EngineId>("default");
  const [mode, setMode] = React.useState<SearchResultsMode>("ranked");
  const [picked, setPicked] = React.useState<EmojiSelection | null>(null);
  const current = ENGINES[engine];
  return (
    <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
      <Demo className="flex-col items-stretch gap-3">
        <Toggle label="Search engine" value={engine} onChange={setEngine} options={Object.entries(ENGINES).map(([id, e]) => [id as EngineId, e.label])} />
        <Toggle label="Results" value={mode} onChange={setMode} options={[["ranked", "ranked"], ["grouped", "grouped"]]} />
        <p className="text-xs text-muted-foreground">{current.note} Try “heart”, “rokcet”, “thumsb up”, or “lgtm” (a custom emoji).</p>
        <div className="flex justify-center">
          {/* Remount per engine: provider options are read once, like a store. */}
          <EmojiProvider key={engine} data={enUrl} customEmojis={TEAM_EMOJI} search={current.search}>
            <ShadcnEmojiPicker onSelect={setPicked} searchResults={mode} defaultSearch="heart" />
          </EmojiProvider>
        </div>
        <p className="h-5 text-center text-xs text-muted-foreground">{picked ? `picked ${picked.emoji || picked.shortcode} ${picked.shortcode ?? ""}` : "Enter picks the highlighted result"}</p>
      </Demo>
      <div className="flex flex-col gap-3">
        <Code title={`search: ${current.label}`}>{current.code}</Code>
        <Code title="results">{`<EmojiPicker.Root searchResults="${mode}">   // "ranked": one list, best first, highlighted
                                         // "grouped": category sections, each in rank order`}</Code>
        <Code title="the contract">{`type EmojiSearch = (query: string, context: {
  records: EmojiRecord[];        // every emoji, custom ones included
  limit: number;
  signal: AbortSignal;           // aborted when the query changes
  frequency(unified): number;    // the user's decayed use count
}) => SearchHit[] | Promise<SearchHit[]>;   // { unified, score? }, best first

// Building blocks (all optional): lexical, fallback, merge, rerank,
// preferFrequent, remote, fuse — from "@brianhung/emoji-picker/search".`}</Code>
      </div>
    </div>
  );
}
