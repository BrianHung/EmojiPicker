import { expandDataset, SKIN_TONES, unifiedToNative, type Dataset, type EmojiRecord, type SkinToneValue } from "./dataset";
import { customRecords, customSources, loadCustomEmojis, type CustomEmoji, type CustomEmojiSource } from "./custom";
import { createFrequencyStore, localStorageAdapter, type EmojiStorage, type FrequencyStore } from "./frequents";
import { localizeLabels, type EmojiLabels } from "./labels";
import { createStore, memo } from "./reactive";
import type { CompletionOrder, SearchIndex } from "./search/search-index";
import { indexFor, interimOf, isThenable, lexical, withInterim, type EmojiSearch, type ProgressiveHits, type SearchHit } from "./search/search";
import { formatShortcode, replaceShortcodes, toneOf } from "./shortcodes";

export type EmojiDataSource = Dataset | string | ((options: { signal: AbortSignal }) => Promise<Dataset>);

export type { CustomEmoji, CustomEmojiLoader, CustomEmojiSource } from "./custom";

export type EmojiStoreOptions = {
  data: EmojiDataSource;
  customEmojis?: CustomEmojiSource | readonly CustomEmojiSource[];
  filter?: (record: EmojiRecord) => boolean;
  frequents?: FrequencyStore;
  skinTone?: SkinToneValue;
  defaultSkinTone?: SkinToneValue;
  onSkinToneChange?: (tone: SkinToneValue) => void;
  skinToneStorage?: EmojiStorage | null;
  searchEngine?: EmojiSearch;
  locale?: string;
  labels?: Partial<EmojiLabels>;
  collator?: Pick<Intl.Collator, "compare">;
};

export type EmojiStoreStatus = "idle" | "loading" | "ready" | "error";

export type EmojiSelection = {
  emoji: string;
  unified: string;
  baseUnified: string;
  name: string;
  shortcode?: string;
  shortcodes: readonly string[];
  skinTone: SkinToneValue;
  isCustom: boolean;
  imageUrl?: string;
};

export type EmojiData = {
  records: readonly EmojiRecord[];
  byUnified: ReadonlyMap<string, EmojiRecord>;
  groupNames: readonly string[];
  locale: string | undefined;
  customs: readonly CustomEmoji[];
  customGroups: ReadonlyMap<string, string | undefined>;
  packErrors: readonly Error[];
};

export type EmojiStoreState = {
  status: EmojiStoreStatus;
  error: Error | null;
  loading: Promise<void> | null;
  data: EmojiData;
  ownTone: SkinToneValue;
  controlledTone: SkinToneValue | undefined;
};

type EmojiStoreAction = { type: "load"; loading: Promise<void> } | { type: "loaded"; data: EmojiData } | { type: "failed"; error: Error } | { type: "tone"; tone: SkinToneValue } | { type: "control"; tone: SkinToneValue | undefined };

const reduce = (state: EmojiStoreState, action: EmojiStoreAction): EmojiStoreState => {
  switch (action.type) {
    case "load":
      return { ...state, status: "loading", loading: action.loading };
    case "loaded":
      return { ...state, status: "ready", data: action.data };
    case "failed":
      return { ...state, status: "error", error: action.error, loading: null };
    case "tone":
      return action.tone === state.ownTone ? state : { ...state, ownTone: action.tone };
    case "control":
      return action.tone === state.controlledTone ? state : { ...state, controlledTone: action.tone };
  }
};

export type EmojiStore = ReturnType<typeof createEmojiStore>;

const defaultEngine = lexical();
const NO_DATA: EmojiData = { records: [], byUnified: new Map(), groupNames: [], locale: undefined, customs: [], customGroups: new Map(), packErrors: [] };

function ingest(dataset: Dataset, loaded: readonly CustomEmoji[], packErrors: readonly Error[], filter: EmojiStoreOptions["filter"], locale: string | undefined): EmojiData {
  const all = expandDataset(dataset);
  const base = all.filter((r) => !filter || filter(r));
  const byCode = new Map(all.map((r) => [r.unified, r]));
  const records = [...base, ...customRecords(loaded, base.length, (u) => byCode.get(u.toLowerCase()))];
  const byUnified = new Map(records.flatMap((r) => [[r.unified, r] as const, ...r.tones.map((t) => [t, r] as const)]));
  return { records, byUnified, groupNames: dataset.groups, locale: locale ?? dataset.locale, customs: loaded, customGroups: new Map(loaded.map((c) => [c.id, c.group])), packErrors };
}

export function createEmojiStore({
  data,
  customEmojis,
  filter,
  frequents = createFrequencyStore(),
  skinTone: controlledTone,
  defaultSkinTone = 0,
  onSkinToneChange,
  skinToneStorage = localStorageAdapter("emoji-picker:skin-tone"),
  searchEngine = defaultEngine,
  locale: localeOption,
  labels: labelOverrides,
  collator,
}: EmojiStoreOptions) {
  const sources = customSources(customEmojis);
  const state = createStore<EmojiStoreState, EmojiStoreAction>(
    { status: "idle", error: null, loading: null, data: { ...NO_DATA, locale: localeOption }, ownTone: clampTone(Number(skinToneStorage?.read() ?? defaultSkinTone)), controlledTone },
    reduce,
  );
  const callbacks = { onSkinToneChange };
  const loaded = () => state.getSnapshot().data;
  const ready = () => state.getSnapshot().status === "ready";
  const labelsFor = memo((locale: string | undefined) => localizeLabels(locale, labelOverrides));
  const indexOf = memo((records: readonly EmojiRecord[], locale: string | undefined) => indexFor(records, { locale, collator }));

  const store = {
    frequents,
    getSnapshot: state.getSnapshot,
    customEmojis: (): readonly CustomEmoji[] => loaded().customs,
    customGroups: (): ReadonlyMap<string, string | undefined> => loaded().customGroups,
    packErrors: (): readonly Error[] => loaded().packErrors,

    load(): Promise<void> {
      const { loading } = state.getSnapshot();
      if (loading) return loading;
      const controller = new AbortController();
      const pending = Promise.all([resolve(data, controller.signal), loadCustomEmojis(sources, controller.signal)]).then(
        ([dataset, packs]) => state.dispatch({ type: "loaded", data: ingest(dataset, packs.emojis, packs.errors, filter, localeOption) }),
        (e: unknown) => {
          const error = e instanceof Error ? e : new Error(String(e));
          state.dispatch({ type: "failed", error });
          throw error;
        },
      );
      state.dispatch({ type: "load", loading: pending });
      return pending;
    },

    prepare() {
      idle(() =>
        store
          .load()
          .then(() => idle(() => store.index()))
          .catch(() => {}),
      );
    },

    status: () => state.getSnapshot().status,
    error: () => state.getSnapshot().error,
    records: (): readonly EmojiRecord[] => loaded().records,
    groupNames: () => loaded().groupNames,
    locale: () => loaded().locale,
    labels: (): EmojiLabels => labelsFor(loaded().locale),

    get: (unified: string) => loaded().byUnified.get(unified.toLowerCase()) ?? loaded().byUnified.get(unified),

    index(): SearchIndex {
      if (!ready()) throw new Error("emoji data is not loaded; await store.load() first");
      return indexOf(loaded().records, loaded().locale);
    },

    fromShortcode: (code: string) => (ready() ? store.index().byShortcode(code) : undefined),
    search: (query: string, limit?: number) => (ready() ? store.index().search(query, limit) : []),

    query(text: string, { limit = 200, signal = new AbortController().signal }: { limit?: number; signal?: AbortSignal } = {}): EmojiRecord[] | Promise<EmojiRecord[]> | ProgressiveHits<EmojiRecord[]> {
      if (!ready() || !text.trim()) return [];
      const resolve = (hits: readonly SearchHit[]) => [...new Set(hits.map((hit) => store.get(hit.unified)).filter((r): r is EmojiRecord => r !== undefined))].slice(0, limit);
      const result = searchEngine(text, { records: loaded().records, limit, signal, frequency: (u) => frequents.score(u), locale: loaded().locale });
      if (!isThenable(result)) return resolve(result);
      const settled = Promise.resolve(result).then(resolve);
      const interim = interimOf(result);
      return interim ? withInterim(settled, resolve(interim)) : settled;
    },
    completeShortcode: (prefix: string, limit?: number, order?: CompletionOrder) => (ready() ? store.index().completeShortcode(prefix, limit, order) : []),
    replaceShortcodes: (text: string) => (ready() ? replaceShortcodes(text, store.index()) : text),

    skinTone: () => {
      const { controlledTone, ownTone } = state.getSnapshot();
      return controlledTone === undefined ? ownTone : clampTone(controlledTone);
    },
    setSkinTone(next: SkinToneValue) {
      const value = clampTone(next);
      const { controlledTone, ownTone } = state.getSnapshot();
      if (controlledTone === undefined && value !== ownTone) {
        skinToneStorage?.write(String(value));
        state.dispatch({ type: "tone", tone: value });
      }
      callbacks.onSkinToneChange?.(value);
    },
    controlSkinTone(value: SkinToneValue | undefined, onChange?: (tone: SkinToneValue) => void) {
      callbacks.onSkinToneChange = onChange;
      state.dispatch({ type: "control", tone: value });
    },

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

    withSkinTone(unified: string): string {
      const record = store.get(unified);
      const current = store.skinTone();
      return record && current && record.tones[current - 1] ? record.tones[current - 1]! : unified;
    },

    subscribe: state.subscribe,
  };
  return store;
}

const clampTone = (n: number): SkinToneValue => (Number.isInteger(n) && n >= 0 && n <= SKIN_TONES.length ? (n as SkinToneValue) : 0);

const byUrl = new Map<string, Promise<Dataset>>();

async function resolve(source: EmojiDataSource, signal: AbortSignal): Promise<Dataset> {
  if (typeof source === "function") return source({ signal });
  if (typeof source !== "string") return source;
  return byUrl.get(source) ?? fetchDataset(source);
}

function fetchDataset(url: string): Promise<Dataset> {
  const pending = fetch(url, { priority: "low" } as RequestInit).then((response) => {
    if (!response.ok) throw new Error(`emoji data: ${response.status} ${response.statusText}`);
    return response.json() as Promise<Dataset>;
  });
  pending.catch(() => byUrl.delete(url));
  byUrl.set(url, pending);
  return pending;
}

function idle(fn: () => void) {
  if (typeof requestIdleCallback === "function") requestIdleCallback(fn, { timeout: 2000 });
  else setTimeout(fn, 1);
}
