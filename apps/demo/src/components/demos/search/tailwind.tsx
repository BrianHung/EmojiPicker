import * as React from "react";
import en from "@emoji-components/data/en/iamcal.json?url";
import { EmojiProvider, lexical, type EmojiPicker, type EmojiSearch, type EmojiSelection } from "emoji-components";
import { EmojiPickerCard } from "@/components/ui/emoji-picker";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { frequentFirst, withFuzzy } from "@/docs/snippets/search";

const slow: EmojiSearch = (query, context) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(lexical()(query, context)), 400);
    context.signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("aborted", "AbortError"));
    });
  });

const ENGINES = {
  default: { label: "Lexical", search: lexical() },
  exact: { label: "No Typos", search: lexical({ typos: false }) },
  fuse: { label: "Fuse", search: withFuzzy },
  frequent: { label: "Frequents", search: frequentFirst },
  remote: { label: "Async", search: slow },
} satisfies Record<string, { label: string; search: EmojiSearch }>;
type Engine = keyof typeof ENGINES;

export function SearchPicker({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  const [engine, setEngine] = React.useState<Engine>("default");
  const [mode, setMode] = React.useState<EmojiPicker.Root.Props["searchResults"]>("ranked");
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
      <EmojiProvider data={en} search={ENGINES[engine].search}>
        <EmojiPickerCard onSelect={onSelect} searchResults={mode} query={query} onQueryChange={setQuery} />
      </EmojiProvider>
    </>
  );
}
