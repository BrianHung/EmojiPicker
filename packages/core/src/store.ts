import { expandDataset, SKIN_TONES, toDataset, unifiedToNative, type Dataset, type EmojiDataInput, type EmojiRecord, type SkinToneValue } from "./dataset";
import { controllable, createChangeDetails, type ChangeDetails } from "./change";
import { customRecords, loadCustomEmojis, uniqueById, type CustomEmoji, type CustomEmojiSource } from "./custom";
import { createFrequencyStore, persisted, readOnFirstSubscribe, type FrequencyStore, type Frequents, type FrequentsChangeDetails } from "./frequents";
import { localizeLabels, type EmojiLabels } from "./labels";
import { DEFAULT_DATA_URL } from "./platform";
import { cached, createStore, fetchJson, memo, toError } from "./reactive";
import type { CompletionOrder, SearchIndex, ShortcodeCompletion } from "./search/search-index";
import { indexFor, isThenable, lexicalSearch, type EmojiSearch, type SearchHit } from "./search/search";
import { formatShortcode, replaceShortcodes, toneOf } from "./shortcodes";

export type EmojiDataSource = Dataset | EmojiDataInput | string | ((options: { signal: AbortSignal }) => Promise<Dataset | EmojiDataInput>);

export type { CustomEmoji, CustomEmojiLoader, CustomEmojiSource } from "./custom";

export interface EmojiStoreOptions {
  data?: EmojiDataSource;
  customEmojis?: CustomEmojiSource;
  filter?: (record: EmojiRecord) => boolean;
  search?: EmojiSearch;
  locale?: string;
  labels?: Partial<EmojiLabels>;
  skinTone?: SkinToneValue;
  defaultSkinTone?: SkinToneValue;
  onSkinToneChange?: (tone: SkinToneValue, details: SkinToneChangeDetails) => void;
  frequents?: Frequents;
  defaultFrequents?: Frequents;
  onFrequentsChange?: (frequents: Frequents, details: FrequentsChangeDetails) => void;
  // Server-rendered pages hydrate with the defaults, then read storage once something subscribes
  deferStorage?: boolean;
}

type EmojiStoreUpdate = Pick<EmojiStoreOptions, "data" | "customEmojis" | "filter" | "search" | "locale" | "skinTone" | "onSkinToneChange" | "frequents" | "onFrequentsChange">;

export type SkinToneChangeDetails = ChangeDetails<"item-press" | "none">;

export type EmojiStoreStatus = "idle" | "loading" | "ready" | "error";

export interface EmojiSelection {
  emoji: string;
  unified: string;
  baseUnified: string;
  name: string;
  shortcode?: string;
  shortcodes: readonly string[];
  skinTone: SkinToneValue;
  isCustom: boolean;
  imageUrl?: string;
}

export interface EmojiStore {
  readonly frequents: FrequencyStore;
  subscribe(listener: () => void): () => void;
  setOptions(options: EmojiStoreUpdate): void;
  load(): Promise<void>;
  prepare(): void;
  status(): EmojiStoreStatus;
  // Changes whenever the records, locale, or search engine do: a key for anything derived from them
  version(): number;
  error(): Error | null;
  records(): readonly EmojiRecord[];
  groupNames(): readonly string[];
  customGroups(): ReadonlyMap<string, string | undefined>;
  customEmojiErrors(): readonly Error[];
  locale(): string | undefined;
  labels(): EmojiLabels;
  get(unified: string): EmojiRecord | undefined;
  frequent(n: number): readonly string[];
  fromShortcode(code: string): EmojiRecord | undefined;
  query(text: string, options?: { limit?: number; signal?: AbortSignal }): EmojiRecord[] | Promise<EmojiRecord[]>;
  completeShortcode(prefix: string, limit?: number, order?: CompletionOrder): ShortcodeCompletion[];
  replaceShortcodes(text: string): string;
  skinTone(): SkinToneValue;
  setSkinTone(tone: SkinToneValue, options?: { reason?: SkinToneChangeDetails["reason"]; event?: Event }): void;
  withSkinTone(unified: string): string;
  select(unified: string, options?: { count?: boolean }): EmojiSelection | undefined;
}

type EmojiData = {
  records: readonly EmojiRecord[];
  byUnified: ReadonlyMap<string, EmojiRecord>;
  groupNames: readonly string[];
  locale: string | undefined;
  customGroups: ReadonlyMap<string, string | undefined>;
  customEmojiErrors: readonly Error[];
};

type State = {
  status: EmojiStoreStatus;
  error: Error | null;
  loading: Promise<void> | null;
  data: EmojiData;
  version: number;
  ownTone: SkinToneValue;
  controlledTone: SkinToneValue | undefined;
};

type Action = { type: "load"; loading: Promise<void> | null } | { type: "loaded"; data: EmojiData } | { type: "failed"; error: Error } | { type: "tone"; tone: SkinToneValue } | { type: "control"; tone: SkinToneValue | undefined };

const reduce = (state: State, action: Action): State => {
  switch (action.type) {
    case "load":
      return { ...state, status: state.status === "ready" ? "ready" : action.loading ? "loading" : "idle", loading: action.loading };
    case "loaded":
      return { ...state, status: "ready", error: null, loading: null, data: action.data, version: state.version + 1 };
    case "failed":
      return { ...state, status: "error", error: action.error, loading: null };
    case "tone":
      return action.tone === state.ownTone ? state : { ...state, ownTone: action.tone };
    case "control":
      return action.tone === state.controlledTone ? state : { ...state, controlledTone: action.tone };
    default:
      return action satisfies never;
  }
};

type Source = Pick<EmojiStoreOptions, "data" | "customEmojis" | "filter" | "search" | "locale">;

const defaultEngine = lexicalSearch();
const CODEPOINTS = /^[\da-f-]+$/i;
const NO_DATA: EmojiData = { records: [], byUnified: new Map(), groupNames: [], locale: undefined, customGroups: new Map(), customEmojiErrors: [] };

type Raw = [dataset: Dataset, packs: { emojis: readonly CustomEmoji[]; errors: readonly Error[] }];

const inline = ({ data, customEmojis }: Source): Raw | null => (typeof data === "object" && typeof customEmojis !== "function" ? [toDataset(data), { emojis: uniqueById(customEmojis ?? []), errors: [] }] : null);

// A loader or list written inline is new every render: loaders count as the same source, lists by their contents
const customKey = (source: CustomEmojiSource | undefined) => (typeof source === "function" ? "" : JSON.stringify(source ?? []));
const sameData = (a: Source, b: Source) => a.data === b.data || (typeof a.data === "function" && typeof b.data === "function" && a.locale === b.locale);
const sameSource = (a: Source, b: Source) => sameData(a, b) && (a.customEmojis === b.customEmojis || customKey(a.customEmojis) === customKey(b.customEmojis));
const sameItems = <T>(a: readonly T[], b: readonly T[]) => a.length === b.length && a.every((x, i) => x === b[i]);

const lookup = (data: EmojiData, unified: string) => data.byUnified.get(unified.toLowerCase()) ?? data.byUnified.get(unified);

const toned = (data: EmojiData, tone: SkinToneValue, unified: string): string => {
  const record = lookup(data, unified);
  return (tone && record?.tones[tone - 1]) || unified;
};

export function createEmojiStore({
  frequents: controlledFrequents,
  defaultFrequents,
  onFrequentsChange,
  skinTone: controlledTone,
  defaultSkinTone = 0,
  onSkinToneChange,
  labels: labelOverrides,
  deferStorage = false,
  ...source
}: EmojiStoreOptions = {}): EmojiStore {
  const frequents = createFrequencyStore({ frequents: controlledFrequents, defaultFrequents, onFrequentsChange, deferStorage });
  const skinToneStorage = persisted("emoji-components:skin-tone");
  let config: Source = source;
  let raw: Raw | null = null;
  let base: readonly EmojiRecord[] = [];
  let controller: AbortController | undefined;
  let onToneChange = onSkinToneChange;
  const expand = memo(expandDataset);
  const build = (next: Raw): EmojiData => {
    raw = next;
    const [dataset, { emojis, errors }] = next;
    const all = expand(dataset);
    const byCode = new Map(all.map((r) => [r.unified, r]));
    const every = [...all, ...customRecords(emojis, all.length, (u) => byCode.get(u.toLowerCase()))];
    const records = (base = config.filter ? every.filter(config.filter) : every);
    const byUnified = new Map(records.flatMap((r) => [[r.unified, r] as const, ...r.tones.map((t) => [t, r] as const)]));
    return { records, byUnified, groupNames: dataset.groups, locale: config.locale ?? dataset.locale, customGroups: new Map(emojis.map((c) => [c.id, c.group])), customEmojiErrors: errors };
  };
  const storedTone = () => clampTone(Number(skinToneStorage.read() ?? defaultSkinTone));
  const state = createStore<State, Action>({ status: "idle", error: null, loading: null, data: { ...NO_DATA, locale: config.locale }, version: 0, ownTone: deferStorage ? clampTone(defaultSkinTone) : storedTone(), controlledTone }, reduce);
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
  const labels = localizeLabels(labelOverrides);
  const indexOf = memo((records: readonly EmojiRecord[], locale: string | undefined) => indexFor(records, { locale }));

  const tone = controllable<SkinToneValue, SkinToneChangeDetails>({
    controlled: () => state.getSnapshot().controlledTone,
    own: () => state.getSnapshot().ownTone,
    onChange: () => onToneChange,
    write(value) {
      skinToneStorage.write(String(value));
      state.dispatch({ type: "tone", tone: value });
    },
  });

  const store: EmojiStore = {
    frequents,
    customGroups: (): ReadonlyMap<string, string | undefined> => loaded().customGroups,
    customEmojiErrors: (): readonly Error[] => loaded().customEmojiErrors,

    load(): Promise<void> {
      const { loading } = state.getSnapshot();
      if (loading || (raw && !raw[1].errors.length)) return loading ?? Promise.resolve();
      const current = (controller = new AbortController());
      const { signal } = current;
      // A failed custom emoji loader runs again; the dataset it loaded with is kept
      const dataset = raw ? Promise.resolve(raw[0]) : resolve(config.data ?? DEFAULT_DATA_URL, signal).then(toDataset);
      const pending = Promise.all([dataset, loadCustomEmojis(config.customEmojis, signal)]).then(
        (next) => {
          if (controller === current) publish(next);
        },
        (e: unknown) => {
          if (controller !== current) return;
          const error = toError(e);
          state.dispatch({ type: "failed", error });
          throw error;
        },
      );
      state.dispatch({ type: "load", loading: pending });
      return pending;
    },

    setOptions({ skinTone, onSkinToneChange, frequents: entries, onFrequentsChange, ...next }) {
      onToneChange = onSkinToneChange;
      state.dispatch({ type: "control", tone: skinTone });
      frequents.control(entries, onFrequentsChange);
      const previous = config;
      config = next;
      if (!sameSource(previous, next)) return reload();
      if (!raw) return;
      const kept = base;
      const data = next.filter === previous.filter && next.locale === previous.locale ? { ...loaded() } : build(raw);
      if (next.locale !== previous.locale || !sameItems(kept, base) || next.search !== previous.search) state.dispatch({ type: "loaded", data });
    },

    prepare() {
      idle(() =>
        store
          .load()
          .then(() => idle(index))
          .catch(() => {}),
      );
    },

    status: () => state.getSnapshot().status,
    version: () => state.getSnapshot().version,
    error: () => state.getSnapshot().error,
    records: (): readonly EmojiRecord[] => loaded().records,
    groupNames: () => loaded().groupNames,
    locale: () => loaded().locale,
    labels: (): EmojiLabels => labels,

    get: (unified: string) => lookup(loaded(), unified),

    frequent(n: number): readonly string[] {
      const all = known(frequents.top(Infinity), loaded(), ready());
      return cached(
        cached(tops, all, () => new Map()),
        n,
        () => all.slice(0, n),
      );
    },

    fromShortcode: (code) => (ready() ? index().byShortcode(code) : undefined),

    query(text, { limit = 200, signal = new AbortController().signal } = {}) {
      if (!ready() || !text.trim()) return [];
      const resolve = (hits: readonly SearchHit[]) => [...new Set(hits.map((hit) => store.get(hit.unified)).filter((r): r is EmojiRecord => r !== undefined))].slice(0, limit);
      const result = (config.search ?? defaultEngine)(text, { records: loaded().records, limit, signal, frequency: (u) => frequents.score(u), locale: loaded().locale });
      return isThenable(result) ? Promise.resolve(result).then(resolve) : resolve(result);
    },
    completeShortcode: (prefix, limit, order) => (ready() ? index().completeShortcode(prefix, limit, order, (u) => frequents.score(u)) : []),
    replaceShortcodes: (text) => (ready() ? replaceShortcodes(text, index()) : text),

    skinTone: () => clampTone(tone.value()),
    setSkinTone(next, { reason = "none", event } = {}) {
      const value = clampTone(next);
      if (value !== store.skinTone()) tone.set(value, createChangeDetails(reason, event));
    },
    select(unified, { count = true } = {}) {
      const record = store.get(unified);
      if (!record) return undefined;
      const tone = record.imageUrl ? 0 : toneOf(unified);
      const resolved = tone ? (record.tones[tone - 1] ?? record.unified) : record.unified;
      if (count) frequents.pick(record.unified);
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

    withSkinTone: (unified) => toned(loaded(), store.skinTone(), unified),

    subscribe: readOnFirstSubscribe(state.subscribe, () => state.dispatch({ type: "tone", tone: storedTone() })),
  };
  const index = (): SearchIndex => indexOf(loaded().records, loaded().locale);
  reload();
  return store;
}

const clampTone = (n: number): SkinToneValue => (Number.isInteger(n) && n >= 0 && n <= SKIN_TONES.length ? (n as SkinToneValue) : 0);

function resolve(source: EmojiDataSource, signal: AbortSignal): Promise<Dataset | EmojiDataInput> {
  if (typeof source === "function") return source({ signal });
  if (typeof source !== "string") return Promise.resolve(source);
  return fetchJson<Dataset | EmojiDataInput>(source, "emoji data", signal);
}

function idle(fn: () => void) {
  if (typeof requestIdleCallback === "function") requestIdleCallback(fn, { timeout: 2000 });
  else setTimeout(fn, 1);
}
