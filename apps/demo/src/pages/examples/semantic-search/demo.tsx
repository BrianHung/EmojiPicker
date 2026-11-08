import * as React from "react";
import enUrl from "@brianhung/emoji-picker-data/en/iamcal.json?url";
import { EmojiProvider, lexical, type CustomEmoji, type EmojiSearch } from "@brianhung/emoji-picker-react";
import { useRenderer } from "@/components/site/shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiStatus, decisionSearch, embeddingsSearch } from "@/lib/semantic-search/api";
import customEmojiJson from "@/lib/semantic-search/custom-emoji.json";
import { loadOnDevice, onDeviceSearch, onDeviceStatus } from "@/lib/semantic-search/on-device";
import { EmojiPickerCard } from "@/registry/emoji-picker";

const CUSTOM_EMOJI: CustomEmoji[] = customEmojiJson;
const SAMPLES = ["jurassic park", "happy cat", "deploy to production"];
const LIMIT = 48;
const EMPTY_BEFORE_DOWNLOAD = "Download the model to search by meaning.";

type Tab = "device" | "vector" | "decision";
const exact = lexical();
// The meaning-based hits first, then lexical ones when there are fewer than 8
const withLexical =
  (search: EmojiSearch): EmojiSearch =>
  async (query, context) => {
    const hits = await search(query, context);
    return hits.length >= 8 ? hits : [...hits, ...exact(query, context)];
  };
const SEARCHES: Record<Tab, EmojiSearch> = {
  device: withLexical(onDeviceSearch),
  vector: withLexical(embeddingsSearch),
  decision: withLexical(decisionSearch),
};

function timed(search: EmojiSearch, report: (t: { query: string; count: number; ms: number }) => void): EmojiSearch {
  return (query, context) => {
    const start = performance.now();
    const done = (hits: readonly unknown[]) => queueMicrotask(() => report({ query, count: hits.length, ms: performance.now() - start }));
    const out = search(query, context);
    if (Array.isArray(out)) {
      done(out);
      return out;
    }
    return Promise.resolve(out).then((hits) => {
      if (!context.signal.aborted) done(hits);
      return hits;
    });
  };
}

const useStore = <T,>(store: { get: () => T; subscribe: (l: () => void) => () => void }) => React.useSyncExternalStore(store.subscribe, store.get, store.get);

export function Demo() {
  const renderer = useRenderer();
  const [tab, setTab] = React.useState<Tab>("device");
  const [query, setQuery] = React.useState("jurassic park");
  const [timing, setTiming] = React.useState<{ query: string; count: number; ms: number } | null>(null);
  const device = useStore(onDeviceStatus);
  const api = useStore(apiStatus);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new search once the on-device model's state changes
  const search = React.useMemo(() => timed(SEARCHES[tab], setTiming), [tab, device.state]);

  const backend = tab === "vector" ? "embeddings" : tab === "decision" ? "decision" : null;
  const unavailable = backend !== null && api[backend] === "unavailable";
  const current = timing && timing.query === query ? timing : null;
  let status: React.ReactNode = current ? `${current.count} results · ${current.ms < 10 ? current.ms.toFixed(1) : Math.round(current.ms)} ms` : null;
  if (unavailable) status = "Available on the deployed site.";
  if (tab === "device" && device.state === "idle") status = EMPTY_BEFORE_DOWNLOAD;
  if (tab === "device" && device.state === "loading") status = device.total ? `Downloading model… ${(device.loaded / 1e6).toFixed(0)} / ${(device.total / 1e6).toFixed(0)} MB` : "Downloading model…";
  if (tab === "device" && device.state === "error") status = `The model didn't load: ${device.error}`;

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="device">On device</TabsTrigger>
          <TabsTrigger value="vector">Vector database</TabsTrigger>
          <TabsTrigger value="decision">Decision model</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex flex-wrap items-center gap-2">
        {SAMPLES.map((s) => (
          <Button key={s} variant="outline" size="sm" onClick={() => setQuery(s)}>
            {s}
          </Button>
        ))}
        {tab === "device" && device.state === "idle" ? (
          <Button size="sm" className="sm:ml-auto" onClick={loadOnDevice}>
            Download model (35 MB)
          </Button>
        ) : null}
      </div>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border px-4 py-8">
        <EmojiProvider data={enUrl} renderer={renderer} customEmojis={CUSTOM_EMOJI} search={search}>
          <EmojiPickerCard query={query} onQueryChange={setQuery} searchLimit={LIMIT} empty={tab === "device" && device.state === "idle" ? EMPTY_BEFORE_DOWNLOAD : undefined} className="w-full max-w-[360px]" />
        </EmojiProvider>
        <p className="min-h-5 text-sm text-muted-foreground tabular-nums" data-testid="status" aria-live="polite">
          {status}
        </p>
      </div>
    </div>
  );
}
