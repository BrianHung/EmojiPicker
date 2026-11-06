import * as React from "react";
import Fuse from "fuse.js";
import en from "@brianhung/emoji-picker-data/en/iamcal.json?url";
import { EmojiProvider, type EmojiRecord, type EmojiSearch, type EmojiSelection, type SearchResultsMode } from "@brianhung/emoji-picker-react";
import { fallback, lexical, preferFrequent, remote, rerank } from "@brianhung/emoji-picker-core/search";
import { EmojiPickerCard } from "@/components/ui/emoji-picker";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const fuses = new WeakMap<readonly EmojiRecord[], Fuse<EmojiRecord>>();
const fuse: EmojiSearch = (query, { records, limit }) => {
  let index = fuses.get(records);
  if (!index) {
    index = new Fuse([...records], { keys: [{ name: "name", weight: 3 }, "shortcodes", { name: "tags", weight: 0.5 }], threshold: 0.4, ignoreLocation: true, includeScore: true });
    fuses.set(records, index);
  }
  return index.search(query, { limit }).map((r) => ({ unified: r.item.unified, score: 1 - (r.score ?? 0) }));
};

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
  default: { label: "lexical()", search: lexical() },
  exact: { label: "No typos", search: lexical({ typos: false }) },
  fuse: { label: "+ Fuse", search: fallback(lexical(), fuse) },
  frequent: { label: "+ Frequents", search: rerank(lexical(), preferFrequent({ weight: 0.6 })) },
  remote: { label: "Async", search: slowEndpoint },
} satisfies Record<string, { label: string; search: EmojiSearch }>;
type Engine = keyof typeof ENGINES;

export function SearchPicker({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  const [engine, setEngine] = React.useState<Engine>("default");
  const [mode, setMode] = React.useState<SearchResultsMode>("ranked");
  const [query, setQuery] = React.useState("");
  return (
    <>
      <Tabs value={engine} onValueChange={setEngine}>
        <TabsList aria-label="Search engine" className="max-w-full flex-wrap">
          {Object.entries(ENGINES).map(([id, e]) => (
            <TabsTrigger key={id} value={id}>
              {e.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Tabs value={mode} onValueChange={setMode}>
        <TabsList aria-label="Results" className="max-w-full flex-wrap">
          <TabsTrigger value="ranked">Ranked</TabsTrigger>
          <TabsTrigger value="grouped">Grouped</TabsTrigger>
        </TabsList>
      </Tabs>
      <EmojiProvider data={en} searchEngine={ENGINES[engine].search}>
        <EmojiPickerCard onSelect={onSelect} searchResults={mode} query={query} onQueryChange={setQuery} />
      </EmojiProvider>
    </>
  );
}
