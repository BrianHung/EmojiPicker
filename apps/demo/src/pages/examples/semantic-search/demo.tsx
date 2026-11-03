// The semantic search demo: one picker, three approaches (on device, a vector DB, a
// decision model with Clef or Jev).
import * as React from "react";
import enUrl from "@brianhung/emoji-picker/data/en.json?url";
import { EmojiProvider, type CustomEmoji, type EmojiSearch } from "@brianhung/emoji-picker";
import { fallback, lexical } from "@brianhung/emoji-picker/search";
import { useRenderer } from "@/components/site/shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiStatus, decisionSearch, embeddingsSearch, type Backend, type DecisionModel } from "@/lib/semantic-search/api";
import customEmojiJson from "@/lib/semantic-search/custom-emoji.json";
import { loadOnDevice, onDeviceSearch, onDeviceStatus } from "@/lib/semantic-search/on-device";
import { EmojiPickerCard } from "@/registry/emoji-picker";

const CUSTOM_EMOJI: CustomEmoji[] = customEmojiJson;
const SAMPLES = ["jurassic park", "happy cat", "deploy to production"];
/** Results per search: a semantic ranking's tail is noise. */
const LIMIT = 48;
const EMPTY_BEFORE_DOWNLOAD = "Download the model to search by meaning.";

type Tab = "device" | "vector" | "decision";
const searchFor = (tab: Tab, model: DecisionModel): EmojiSearch => {
  if (tab === "device") return fallback(onDeviceSearch, lexical());
  if (tab === "vector") return fallback(embeddingsSearch, lexical());
  return fallback(decisionSearch(model), lexical());
};
const MODELS: { value: DecisionModel; label: string }[] = [
  { value: "jev", label: "Jev" },
  { value: "clef-omni", label: "Clef Omni" },
  { value: "clef-flash", label: "Clef Flash" },
  { value: "clef", label: "Clef" },
];

/** Reports how many results the provider's search returned and how long it took. */
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
  const [model, setModel] = React.useState<DecisionModel>("jev");
  const [timing, setTiming] = React.useState<{ query: string; count: number; ms: number } | null>(null);
  const device = useStore(onDeviceStatus);
  const api = useStore(apiStatus);
  const search = React.useMemo(() => timed(searchFor(tab, model), setTiming), [tab, model]);

  const backend: Backend | null = tab === "vector" ? "embeddings" : tab === "decision" ? model : null;
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
          <TabsTrigger value="vector">Vector DB</TabsTrigger>
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
        {tab === "decision" ? (
          <Tabs value={model} onValueChange={(v) => setModel(v as DecisionModel)} className="sm:ml-auto">
            <TabsList aria-label="Model">
              {MODELS.map((m) => (
                <TabsTrigger key={m.value} value={m.value}>
                  {m.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : null}
      </div>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border px-4 py-8">
        {/* The provider reads `search` once: remount it per backend, and when the model arrives. */}
        <EmojiProvider key={`${tab}:${model}:${device.state}`} data={enUrl} renderer={renderer} customEmojis={CUSTOM_EMOJI} search={search}>
          <EmojiPickerCard search={query} onSearchChange={setQuery} searchLimit={LIMIT} empty={tab === "device" && device.state === "idle" ? EMPTY_BEFORE_DOWNLOAD : undefined} className="w-full max-w-[360px]" />
        </EmojiProvider>
        <p className="min-h-5 text-sm text-muted-foreground tabular-nums" data-testid="status" aria-live="polite">
          {status}
        </p>
      </div>
    </div>
  );
}
