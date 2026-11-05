import { expandDataset, SKIN_TONES, unifiedToNative, type Dataset, type EmojiRecord, type SkinToneValue } from "./dataset";
import { customRecords, customSources, loadCustomEmojis, type CustomEmoji, type CustomEmojiSource } from "./custom";
import { createFrequencyStore, localStorageAdapter, type EmojiStorage, type FrequencyStore } from "./frequents";
import { localizeLabels, type EmojiLabels } from "./labels";
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

export type EmojiStore = ReturnType<typeof createEmojiStore>;

const defaultEngine = lexical();

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
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  let toneControl = { value: controlledTone, onChange: onSkinToneChange };

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
  let ownTone = clampTone(Number(skinToneStorage?.read() ?? defaultSkinTone));
  let labels: EmojiLabels | null = null;

  function ingest(dataset: Dataset, loaded: readonly CustomEmoji[]) {
    const all = expandDataset(dataset);
    const base = all.filter((r) => !filter || filter(r));
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
    customEmojis: (): readonly CustomEmoji[] => customs,
    customGroups: (): ReadonlyMap<string, string | undefined> => customGroups,
    packErrors: (): readonly Error[] => packErrors,

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

    prepare() {
      idle(() =>
        store
          .load()
          .then(() => idle(() => store.index()))
          .catch(() => {}),
      );
    },

    status: () => status,
    error: () => error,
    records: (): readonly EmojiRecord[] => records,
    groupNames: () => groupNames,
    locale: () => locale,
    labels: (): EmojiLabels => (labels ??= localizeLabels(locale, labelOverrides)),

    get: (unified: string) => byUnified.get(unified.toLowerCase()) ?? byUnified.get(unified),

    index(): SearchIndex {
      if (status !== "ready") throw new Error("emoji data is not loaded; await store.load() first");
      return (index ??= indexFor(records, { locale, collator }));
    },

    fromShortcode: (code: string) => (status === "ready" ? store.index().byShortcode(code) : undefined),
    search: (query: string, limit?: number) => (status === "ready" ? store.index().search(query, limit) : []),

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
      const result = searchEngine(text, { records, limit, signal, frequency: (u) => frequents.score(u), locale });
      if (!isThenable(result)) return resolve(result);
      const settled = Promise.resolve(result).then(resolve);
      const interim = interimOf(result);
      return interim ? withInterim(settled, resolve(interim)) : settled;
    },
    completeShortcode: (prefix: string, limit?: number, order?: CompletionOrder) => (status === "ready" ? store.index().completeShortcode(prefix, limit, order) : []),
    replaceShortcodes: (text: string) => (status === "ready" ? replaceShortcodes(text, store.index()) : text),

    skinTone: () => (toneControl.value === undefined ? ownTone : clampTone(toneControl.value)),
    setSkinTone(next: SkinToneValue) {
      const value = clampTone(next);
      if (toneControl.value === undefined && value !== ownTone) {
        ownTone = value;
        skinToneStorage?.write(String(value));
        emit();
      }
      toneControl.onChange?.(value);
    },
    controlSkinTone(value: SkinToneValue | undefined, onChange?: (tone: SkinToneValue) => void) {
      const changed = value !== toneControl.value;
      toneControl = { value, onChange };
      if (changed) emit();
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

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
  return store;
}

const clampTone = (n: number): SkinToneValue => (Number.isInteger(n) && n >= 0 && n <= SKIN_TONES.length ? (n as SkinToneValue) : 0);

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
    pending.catch(() => byUrl.delete(source));
    byUrl.set(source, pending);
  }
  return pending;
}

function idle(fn: () => void) {
  if (typeof requestIdleCallback === "function") requestIdleCallback(fn, { timeout: 2000 });
  else setTimeout(fn, 1);
}
