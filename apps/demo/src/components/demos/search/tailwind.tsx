import * as React from "react";
import Fuse from "fuse.js";
import en from "@brianhung/emoji-picker-core/data/en.json?url";
import { EmojiProvider, type EmojiSearch, type EmojiSelection, type SearchResultsMode } from "@brianhung/emoji-picker";
import { fallback, fuse, lexical, preferFrequent, remote, rerank } from "@brianhung/emoji-picker-core/search";
import { EmojiPickerCard } from "@/components/ui/emoji-picker";
import { Chips } from "@/components/site/chips";

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
  fuse: { label: "+ Fuse", search: fallback(lexical(), fuse(Fuse)) },
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
      <Chips label="Search engine" value={engine} onChange={setEngine} options={Object.entries(ENGINES).map(([id, e]) => [id as Engine, e.label])} />
      <Chips label="Results" value={mode} onChange={setMode} options={[["ranked", "Ranked"], ["grouped", "Grouped"]]} />
      <EmojiProvider key={engine} data={en} searchEngine={ENGINES[engine].search}>
        <EmojiPickerCard onSelect={onSelect} searchResults={mode} query={query} onQueryChange={setQuery} />
      </EmojiProvider>
    </>
  );
}
