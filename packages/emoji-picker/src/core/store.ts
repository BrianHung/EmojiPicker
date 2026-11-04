import { expandDataset, SKIN_TONES, unifiedToNative, type Dataset, type EmojiRecord } from "./dataset";
import { customRecords, customSources, loadCustomEmojis, type CustomEmoji, type CustomEmojiSource } from "./custom";
import { createFrequencyStore, localStorageAdapter, type FrequencyStore } from "./frequents";
import { localizeLabels, type EmojiLabels } from "./labels";
import type { CompletionOrder, SearchIndex } from "./search-index";
import { indexFor, interimOf, isThenable, lexical, withInterim, type EmojiSearch, type ProgressiveHits, type SearchHit } from "./search";
import { formatShortcode, replaceShortcodes, toneOf } from "./shortcodes";

/** A dataset object, a URL to one, or a loader. Load it as a separate asset, not inlined into JS. */
export type EmojiDataSource = Dataset | string | ((options: { signal: AbortSignal }) => Promise<Dataset>);

export type { CustomEmoji, CustomEmojiLoader, CustomEmojiSource } from "./custom";

export type EmojiStoreOptions = {
  data: EmojiDataSource;
  /**
   * Custom emoji: an array, a pack's JSON URL, a loader `({ signal }) => Promise<CustomEmoji[]>`,
   * or an array mixing them (several packs). Packs load with the data, in parallel.
   */
  customEmojis?: CustomEmojiSource | readonly CustomEmojiSource[];
  /** Drop emoji from the picker and search. */
  filter?: (record: EmojiRecord) => boolean;
  frequents?: FrequencyStore;
  /** Default 0 (none). 1-5 are the Fitzpatrick tones. */
  defaultSkinTone?: number;
  /**
   * How queries become results, for the picker and useEmojiSearch. Any function
   * `(query, context) => hits | Promise<hits>`; default `lexical()`. Compose with
   * the helpers in `@brianhung/emoji-picker/search`.
   */
  search?: EmojiSearch;
  /**
   * BCP 47 tag for everything language-specific: case folding, word segmentation and A–Z order
   * in search, and the labels' counts. Default: the dataset's `locale`. Each piece replaces only
   * itself: `labels`, `collator`, a `search` engine (`lexical({ segmenter, tokenize })`), or `data`.
   */
  locale?: string;
  /** Interface strings over the English defaults (`localizeLabels(locale, labels)`). */
  labels?: Partial<EmojiLabels>;
  /** A–Z order of alphabetical shortcode completion. Default `new Intl.Collator(locale)`. */
  collator?: Pick<Intl.Collator, "compare">;
};

export type EmojiStoreStatus = "idle" | "loading" | "ready" | "error";

/** The resolved form of a pick, from the picker, a tapback or autocomplete. */
export type EmojiSelection = {
  /** Text to insert. Empty for custom emoji. */
  emoji: string;
  unified: string;
  baseUnified: string;
  name: string;
  /** ":thumbsup:" or ":thumbsup::skin-tone-3:" when one exists. */
  shortcode?: string;
  shortcodes: readonly string[];
  skinTone: number;
  isCustom: boolean;
  imageUrl?: string;
};

export type EmojiStore = ReturnType<typeof createEmojiStore>;

const defaultSearch = lexical();

export function createEmojiStore({ data, customEmojis, filter, frequents = createFrequencyStore(), defaultSkinTone = 0, search = defaultSearch, locale: localeOption, labels: labelOverrides, collator }: EmojiStoreOptions) {
  const sources = customSources(customEmojis);
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  const toneStorage = localStorageAdapter("emoji-picker:skin-tone");

  let status: EmojiStoreStatus = "idle";
  let error: Error | null = null;
  let pending: Promise<void> | null = null;
  let records: EmojiRecord[] = [];
  let groupNames: readonly string[] = [];
  let locale = localeOption;
  let byUnified = new Map<string, EmojiRecord>();
  let index: SearchIndex | null = null;
  let customs: readonly CustomEmoji[] = [];
  let customGroups = new Map<string, string | undefined>();
  let packErrors: readonly Error[] = [];
  let skinTone = clampTone(Number(toneStorage.read() ?? defaultSkinTone));
  let labels: EmojiLabels | null = null;

  function ingest(dataset: Dataset, loaded: readonly CustomEmoji[]) {
    const all = expandDataset(dataset);
    const base = all.filter((r) => !filter || filter(r));
    // A custom emoji's base may be filtered out of the picker and still lend its words.
    const byCode = new Map(all.map((r) => [r.unified, r]));
    customs = loaded;
    customGroups = new Map(loaded.map((c) => [c.id, c.group]));
    records = [...base, ...customRecords(loaded, base.length, (u) => byCode.get(u.toLowerCase()))];
    groupNames = dataset.groups;
    locale = localeOption ?? dataset.locale;
    labels = null;
    byUnified = new Map();
    for (const r of records) {
      byUnified.set(r.unified, r);
      for (const t of r.tones) byUnified.set(t, r);
    }
    index = null;
  }

  const store = {
    frequents,
    /** Custom emoji once loaded (inline ones and every pack). */
    customEmojis: (): readonly CustomEmoji[] => customs,
    /** Custom emoji id → its group, once loaded. */
    customGroups: (): ReadonlyMap<string, string | undefined> => customGroups,
    /** Packs that failed to load; they're left out, the rest of the picker works. */
    packErrors: (): readonly Error[] => packErrors,

    /** Fetch and expand the dataset. Idempotent; safe to call from many pickers. */
    load(): Promise<void> {
      if (pending) return pending;
      status = "loading";
      emit();
      const controller = new AbortController();
      pending = Promise.all([resolve(data, controller.signal), loadCustomEmojis(sources, controller.signal)])
        .then(([dataset, packs]) => {
          packErrors = packs.errors;
          ingest(dataset, packs.emojis);
          status = "ready";
          emit();
        })
        .catch((e: unknown) => {
          error = e instanceof Error ? e : new Error(String(e));
          status = "error";
          pending = null;
          emit();
          throw error;
        });
      return pending;
    },

    /** Load data and build the search index in idle time, before anyone opens a picker. */
    prepare() {
      idle(() => store.load().then(() => idle(() => store.index())).catch(() => {}));
    },

    status: () => status,
    error: () => error,
    records: (): readonly EmojiRecord[] => records,
    /** Localized category names from the dataset, in GROUPS order. */
    groupNames: () => groupNames,
    /** The `locale` option, else the dataset's once loaded. */
    locale: () => locale,
    /** The `labels` option over the English defaults, with counts in `locale`. */
    labels: (): EmojiLabels => (labels ??= localizeLabels(locale, labelOverrides)),

    /** Base record for a unified code, a skin-tone variation or a custom emoji id. */
    get: (unified: string) => byUnified.get(unified.toLowerCase()) ?? byUnified.get(unified),

    /** The search index, built on first use. */
    index(): SearchIndex {
      if (status !== "ready") throw new Error("emoji data is not loaded; await store.load() first");
      return (index ??= indexFor(records, { locale, collator }));
    },

    /** Record for a Slack shortcode ("tada" or ":tada:"), including custom emoji. */
    fromShortcode: (code: string) => (status === "ready" ? store.index().byShortcode(code) : undefined),
    search: (query: string, limit?: number) => (status === "ready" ? store.index().search(query, limit) : []),

    /**
     * Run the configured search. Sync engines return records directly; async ones
     * a promise, which has `interim` records when the search shows some meanwhile
     * (`progressive`). Unknown codes are dropped and duplicates removed.
     */
    query(text: string, { limit = 200, signal = new AbortController().signal }: { limit?: number; signal?: AbortSignal } = {}): EmojiRecord[] | Promise<EmojiRecord[]> | ProgressiveHits<EmojiRecord[]> {
      if (status !== "ready" || !text.trim()) return [];
      const resolve = (hits: readonly SearchHit[]) => {
        const seen = new Set<EmojiRecord>();
        for (const hit of hits) {
          const record = store.get(hit.unified);
          if (record && !seen.has(record)) seen.add(record);
          if (seen.size >= limit) break;
        }
        return [...seen];
      };
      const result = search(text, { records, limit, signal, frequency: (u) => frequents.score(u), locale });
      if (!isThenable(result)) return resolve(result);
      const settled = Promise.resolve(result).then(resolve);
      const interim = interimOf(result);
      return interim ? withInterim(settled, resolve(interim)) : settled;
    },
    completeShortcode: (prefix: string, limit?: number, order?: CompletionOrder) => (status === "ready" ? store.index().completeShortcode(prefix, limit, order) : []),
    replaceShortcodes: (text: string) => (status === "ready" ? replaceShortcodes(text, store.index()) : text),

    skinTone: () => skinTone,
    setSkinTone(tone: number) {
      skinTone = clampTone(tone);
      toneStorage.write(String(skinTone));
      emit();
    },

    /** Build the selection for an emoji (or variation) and count it as used. */
    select(unified: string): EmojiSelection | undefined {
      const record = store.get(unified);
      if (!record) return undefined;
      const tone = record.imageUrl ? 0 : toneOf(unified);
      const resolved = tone ? (record.tones[tone - 1] ?? record.unified) : record.unified;
      frequents.record(record.unified);
      return {
        emoji: record.imageUrl ? "" : unifiedToNative(resolved),
        unified: resolved,
        baseUnified: record.unified,
        name: record.name,
        shortcode: formatShortcode(record, tone),
        shortcodes: record.shortcodes,
        skinTone: tone,
        isCustom: Boolean(record.imageUrl),
        imageUrl: record.imageUrl,
      };
    },

    /** Applies the current skin tone to a base emoji when it has variations. */
    withSkinTone(unified: string): string {
      const record = store.get(unified);
      return record && skinTone && record.tones[skinTone - 1] ? record.tones[skinTone - 1]! : unified;
    },

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
  return store;
}

const clampTone = (n: number) => (Number.isInteger(n) && n >= 0 && n <= SKIN_TONES.length ? n : 0);

// Stores (one per provider) that load the same URL share one request and one parse.
const byUrl = new Map<string, Promise<Dataset>>();

async function resolve(source: EmojiDataSource, signal: AbortSignal): Promise<Dataset> {
  if (typeof source === "function") return source({ signal });
  if (typeof source !== "string") return source;
  let pending = byUrl.get(source);
  if (!pending) {
    pending = fetch(source, { priority: "low" } as RequestInit).then((response) => {
      if (!response.ok) throw new Error(`emoji data: ${response.status} ${response.statusText}`);
      return response.json() as Promise<Dataset>;
    });
    pending.catch(() => byUrl.delete(source)); // let a later load retry
    byUrl.set(source, pending);
  }
  return pending;
}

function idle(fn: () => void) {
  if (typeof requestIdleCallback === "function") requestIdleCallback(fn, { timeout: 2000 });
  else setTimeout(fn, 1);
}
