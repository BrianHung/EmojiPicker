import { expandDataset, SKIN_TONES, toDataset, unifiedToNative, type Dataset, type EmojiDataInput, type EmojiRecord, type SkinToneValue } from "./dataset";
import { createChangeDetails, type ChangeDetails } from "./change";
import { customRecords, customSources, loadCustomEmojis, type CustomEmoji, type CustomEmojiSource } from "./custom";
import { createFrequencyStore, localStorageAdapter, syncWith, type EmojiStorage, type FrequencyStore, type FrequencyStoreOptions } from "./frequents";
import { localizeLabels, type EmojiLabels } from "./labels";
import { DEFAULT_DATA_URL } from "./platform";
import { cached, createStore, memo } from "./reactive";
import type { CompletionOrder, SearchIndex } from "./search/search-index";
import { indexFor, interimOf, isThenable, lexical, withInterim, type EmojiSearch, type ProgressiveHits, type SearchHit } from "./search/search";
import { formatShortcode, replaceShortcodes, toneOf } from "./shortcodes";

export type EmojiDataSource = Dataset | EmojiDataInput | string | ((options: { signal: AbortSignal }) => Promise<Dataset | EmojiDataInput>);

export type { CustomEmoji, CustomEmojiLoader, CustomEmojiSource } from "./custom";

export type EmojiStoreOptions = FrequencyStoreOptions & {
  data?: EmojiDataSource;
  customEmojis?: CustomEmojiSource | readonly CustomEmojiSource[];
  filter?: (record: EmojiRecord) => boolean;
  skinTone?: SkinToneValue;
  defaultSkinTone?: SkinToneValue;
  onSkinToneChange?: (tone: SkinToneValue, details: SkinToneChangeDetails) => void;
  skinToneStorage?: EmojiStorage | null;
  searchEngine?: EmojiSearch;
  locale?: string;
  labels?: Partial<EmojiLabels>;
};

export type SkinToneChangeDetails = ChangeDetails<"option-press" | "none">;

export type EmojiSourceOptions = Pick<EmojiStoreOptions, "data" | "customEmojis" | "filter" | "searchEngine" | "locale">;

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

type EmojiStoreAction = { type: "load"; loading: Promise<void> | null } | { type: "loaded"; data: EmojiData } | { type: "failed"; error: Error } | { type: "tone"; tone: SkinToneValue } | { type: "control"; tone: SkinToneValue | undefined };

const reduce = (state: EmojiStoreState, action: EmojiStoreAction): EmojiStoreState => {
  switch (action.type) {
    case "load":
      return { ...state, status: state.status === "ready" ? "ready" : action.loading ? "loading" : "idle", loading: action.loading };
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
const CODEPOINTS = /^[\da-f-]+$/i;
const NO_DATA: EmojiData = { records: [], byUnified: new Map(), groupNames: [], locale: undefined, customs: [], customGroups: new Map(), packErrors: [] };

type Raw = [dataset: Dataset, packs: { emojis: readonly CustomEmoji[]; errors: readonly Error[] }];

const inline = ({ data, customEmojis }: EmojiSourceOptions): Raw | null => (typeof data === "object" && !customSources(customEmojis).length ? [toDataset(data), { emojis: [], errors: [] }] : null);

const sameItems = <T>(a: readonly T[], b: readonly T[]) => a.length === b.length && a.every((x, i) => x === b[i]);
const sameSource = (a: EmojiSourceOptions, b: EmojiSourceOptions) => a.data === b.data && sameItems(customSources(a.customEmojis), customSources(b.customEmojis));

const lookup = (data: EmojiData, unified: string) => data.byUnified.get(unified.toLowerCase()) ?? data.byUnified.get(unified);

export function toned(data: EmojiData, tone: SkinToneValue, unified: string): string {
  const record = lookup(data, unified);
  return record && tone && record.tones[tone - 1] ? record.tones[tone - 1]! : unified;
}

export function createEmojiStore({
  frequents: controlledFrequents,
  defaultFrequents,
  onFrequentsChange,
  frequentsStorage,
  frequentsHalfLifeDays,
  frequentsMax,
  skinTone: controlledTone,
  defaultSkinTone = 0,
  onSkinToneChange,
  skinToneStorage = localStorageAdapter("emoji-picker:skin-tone"),
  labels: labelOverrides,
  ...source
}: EmojiStoreOptions = {}) {
  const frequents = createFrequencyStore({ frequents: controlledFrequents, defaultFrequents, onFrequentsChange, frequentsStorage, frequentsHalfLifeDays, frequentsMax });
  let config: EmojiSourceOptions = source;
  let raw: Raw | null = null;
  let base: readonly EmojiRecord[] = [];
  let controller: AbortController | undefined;
  let onToneChange = onSkinToneChange;
  const expand = memo(expandDataset);
  const build = (next: Raw): EmojiData => {
    raw = next;
    const [dataset, { emojis, errors }] = next;
    const all = expand(dataset);
    base = config.filter ? all.filter(config.filter) : all;
    const byCode = new Map(all.map((r) => [r.unified, r]));
    const records = [...base, ...customRecords(emojis, base.length, (u) => byCode.get(u.toLowerCase()))];
    const byUnified = new Map(records.flatMap((r) => [[r.unified, r] as const, ...r.tones.map((t) => [t, r] as const)]));
    return { records, byUnified, groupNames: dataset.groups, locale: config.locale ?? dataset.locale, customs: emojis, customGroups: new Map(emojis.map((c) => [c.id, c.group])), packErrors: errors };
  };
  const storedTone = () => clampTone(Number(skinToneStorage?.read() ?? defaultSkinTone));
  const state = createStore<EmojiStoreState, EmojiStoreAction>({ status: "idle", error: null, loading: null, data: { ...NO_DATA, locale: config.locale }, ownTone: storedTone(), controlledTone }, reduce);
  const loaded = () => state.getSnapshot().data;
  const ready = () => state.getSnapshot().status === "ready";
  const publish = (next: Raw) => state.dispatch({ type: "loaded", data: build(next) });
  const reload = () => {
    const { status } = state.getSnapshot();
    controller?.abort();
    controller = undefined;
    raw = inline(config);
    state.dispatch({ type: "load", loading: null });
    if (raw) publish(raw);
    else if (status !== "idle") store.load().catch(() => {});
  };
  const known = memo((ranked: readonly string[], data: EmojiData, isReady: boolean) => ranked.filter((u) => (isReady ? lookup(data, u) : CODEPOINTS.test(u))));
  const tops = new WeakMap<readonly string[], Map<number, readonly string[]>>();
  const labelsFor = memo((locale: string | undefined) => localizeLabels(locale, labelOverrides));
  const indexOf = memo((records: readonly EmojiRecord[], locale: string | undefined) => indexFor(records, { locale }));

  const store = {
    frequents: frequents as FrequencyStore,
    controlFrequents: frequents.control,
    getSnapshot: state.getSnapshot,
    customEmojis: (): readonly CustomEmoji[] => loaded().customs,
    customGroups: (): ReadonlyMap<string, string | undefined> => loaded().customGroups,
    packErrors: (): readonly Error[] => loaded().packErrors,

    load(): Promise<void> {
      const { loading } = state.getSnapshot();
      if (loading || raw) return loading ?? Promise.resolve();
      const current = (controller = new AbortController());
      const { signal } = current;
      const pending = Promise.all([resolve(config.data ?? DEFAULT_DATA_URL, signal).then(toDataset), loadCustomEmojis(customSources(config.customEmojis), signal)]).then(
        (next) => {
          if (controller === current) publish(next);
        },
        (e: unknown) => {
          if (controller !== current) return;
          const error = e instanceof Error ? e : new Error(String(e));
          state.dispatch({ type: "failed", error });
          throw error;
        },
      );
      state.dispatch({ type: "load", loading: pending });
      return pending;
    },

    setOptions(next: EmojiSourceOptions) {
      const previous = config;
      config = next;
      if (!sameSource(previous, next)) return reload();
      if (!raw) return;
      const kept = base;
      const data = next.filter === previous.filter && next.locale === previous.locale ? { ...loaded() } : build(raw);
      if (next.locale !== previous.locale || !sameItems(kept, base) || next.searchEngine !== previous.searchEngine) state.dispatch({ type: "loaded", data });
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

    get: (unified: string) => lookup(loaded(), unified),

    frequent(n: number): readonly string[] {
      const all = known(frequents.top(Infinity), loaded(), ready());
      return cached(
        cached(tops, all, () => new Map()),
        n,
        () => all.slice(0, n),
      );
    },

    index(): SearchIndex {
      if (!ready()) throw new Error("emoji data is not loaded; await store.load() first");
      return indexOf(loaded().records, loaded().locale);
    },

    fromShortcode: (code: string) => (ready() ? store.index().byShortcode(code) : undefined),

    query(text: string, { limit = 200, signal = new AbortController().signal }: { limit?: number; signal?: AbortSignal } = {}): EmojiRecord[] | Promise<EmojiRecord[]> | ProgressiveHits<EmojiRecord[]> {
      if (!ready() || !text.trim()) return [];
      const resolve = (hits: readonly SearchHit[]) => [...new Set(hits.map((hit) => store.get(hit.unified)).filter((r): r is EmojiRecord => r !== undefined))].slice(0, limit);
      const result = (config.searchEngine ?? defaultEngine)(text, { records: loaded().records, limit, signal, frequency: (u) => frequents.score(u), locale: loaded().locale });
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
    setSkinTone(next: SkinToneValue, { reason = "none", event }: { reason?: SkinToneChangeDetails["reason"]; event?: Event } = {}) {
      const value = clampTone(next);
      if (value === store.skinTone()) return;
      const details = createChangeDetails(reason, event);
      onToneChange?.(value, details);
      if (details.isCanceled || state.getSnapshot().controlledTone !== undefined) return;
      skinToneStorage?.write(String(value));
      state.dispatch({ type: "tone", tone: value });
    },
    controlSkinTone(value: SkinToneValue | undefined, onChange?: EmojiStoreOptions["onSkinToneChange"]) {
      onToneChange = onChange;
      state.dispatch({ type: "control", tone: value });
    },

    select(unified: string, { record: count = true } = {}): EmojiSelection | undefined {
      const record = store.get(unified);
      if (!record) return undefined;
      const tone = record.imageUrl ? 0 : toneOf(unified);
      const resolved = tone ? (record.tones[tone - 1] ?? record.unified) : record.unified;
      if (count) frequents.record(record.unified);
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

    withSkinTone: (unified: string): string => toned(loaded(), store.skinTone(), unified),

    subscribe: syncWith(skinToneStorage, state.subscribe, () => state.dispatch({ type: "tone", tone: storedTone() })),
  };
  reload();
  return store;
}

const clampTone = (n: number): SkinToneValue => (Number.isInteger(n) && n >= 0 && n <= SKIN_TONES.length ? (n as SkinToneValue) : 0);

const byUrl = new Map<string, Promise<Dataset | EmojiDataInput>>();

function resolve(source: EmojiDataSource, signal: AbortSignal): Promise<Dataset | EmojiDataInput> {
  if (typeof source === "function") return source({ signal });
  if (typeof source !== "string") return Promise.resolve(source);
  return cached(byUrl, source, () => {
    const pending = fetch(source, { priority: "low" } as RequestInit).then((response) => {
      if (!response.ok) throw new Error(`emoji data: ${response.status} ${response.statusText}`);
      return response.json() as Promise<Dataset | EmojiDataInput>;
    });
    pending.catch(() => byUrl.delete(source));
    return pending;
  });
}

function idle(fn: () => void) {
  if (typeof requestIdleCallback === "function") requestIdleCallback(fn, { timeout: 2000 });
  else setTimeout(fn, 1);
}
