import * as React from "react";
import { I18nProvider, useLocale } from "react-aria/I18nProvider";
import { createEmojiStore, type EmojiLabels, type EmojiStore, type EmojiStoreOptions, isUnified, localizeLabels, type Renderer, TWEMOJI_EMOJI_VERSION, twemojiUrl } from "@brianhung/emoji-picker-core";
import { useStore } from "../utils/store";
import { useLayoutEffect } from "../utils/utils";
import { needsImageFallback, onNativeSupportChange } from "@brianhung/emoji-picker-core/native";

export type { EmojiLabels };

export type ImageUrl = (unified: string, context: { renderer: Renderer }) => string | undefined;

const twemoji: ImageUrl = (unified, { renderer }) => (renderer === "image" ? twemojiUrl(unified) : undefined);

export type EmojiProviderProps = Omit<EmojiStoreOptions, "deferStorage"> & {
  renderer?: Renderer | "auto";
  imageUrl?: ImageUrl;
  imageVersion?: number;
  prepare?: boolean;
  children: React.ReactNode;
};

type ContextValue = {
  store: EmojiStore;
  renderer: Renderer;
  image(unified: string, renderer?: Renderer): string | undefined;
  labels: EmojiLabels;
  maxVersion?: number;
};

export const EmojiContext = React.createContext<ContextValue | null>(null);

const contextValue = (store: EmojiStore, renderer: Renderer, imageUrl: ImageUrl, imageVersion: number, labels: EmojiLabels): ContextValue => ({
  store,
  renderer,
  image: (unified, as = renderer) => (isUnified(unified) ? imageUrl(unified, { renderer: as }) : undefined),
  labels,
  maxVersion: renderer === "image" ? imageVersion : undefined,
});

const noop = () => () => {};
// True while hydrating (and on the server): storage then waits until after mount, so the first client render matches the server's
const useHydrating = () =>
  React.useSyncExternalStore(
    noop,
    () => false,
    () => true,
  );

function useRenderer(renderer: Renderer | "auto") {
  const [detected, setDetected] = React.useState<Renderer>("native");
  React.useEffect(() => {
    if (renderer !== "auto") return;
    const detect = () => setDetected(needsImageFallback() ? "image" : "native");
    detect();
    return onNativeSupportChange(detect);
  }, [renderer]);
  return renderer === "auto" ? detected : renderer;
}

export function EmojiProvider(props: EmojiProviderProps) {
  const deferStorage = useHydrating();
  const [store] = React.useState(() => createEmojiStore({ ...props, deferStorage }));
  return <Provider {...props} store={store} />;
}

function Provider({ renderer = "auto", imageUrl = twemoji, imageVersion = TWEMOJI_EMOJI_VERSION, prepare = true, labels, locale, children, store, ...options }: EmojiProviderProps & { store: EmojiStore }) {
  const { skinTone, onSkinToneChange, frequents, onFrequentsChange, data, customEmojis, filter, searchEngine } = options;
  useLayoutEffect(
    () => store.setOptions({ data, customEmojis, filter, searchEngine, locale, skinTone, onSkinToneChange, frequents, onFrequentsChange }),
    [store, data, customEmojis, filter, searchEngine, locale, skinTone, onSkinToneChange, frequents, onFrequentsChange],
  );
  React.useEffect(() => void (prepare && store.prepare()), [prepare, store]);
  const resolved = useRenderer(renderer);
  const merged = useLabels(labels);
  const value = React.useMemo(() => contextValue(store, resolved, imageUrl, imageVersion, merged), [store, resolved, imageUrl, imageVersion, merged]);
  // React Aria's provider swaps components between a set and an unset locale, which would remount the tree
  const inherited = useLocale().locale;
  return (
    <I18nProvider locale={locale ?? inherited}>
      <EmojiContext.Provider value={value}>{children}</EmojiContext.Provider>
    </I18nProvider>
  );
}

// Labels written inline are a new object every render: their JSON and their two functions are what change
function useLabels(labels: Partial<EmojiLabels> | undefined): EmojiLabels {
  const key = labels ? JSON.stringify(labels) : "";
  const { resultCount, withSkinTone } = labels ?? {};
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the labels' contents, not their identity
  return React.useMemo(() => localizeLabels(labels), [key, resultCount, withSkinTone]);
}

let sharedStore: EmojiStore | undefined;
const shared: Partial<Record<Renderer, ContextValue>> = {};

// Everything outside an EmojiProvider shares one store, created on first use with the provider's defaults, so frequents and the skin tone agree
const sharedValue = (deferStorage: boolean, renderer: Renderer) => (shared[renderer] ??= contextValue((sharedStore ??= createEmojiStore({ deferStorage })), renderer, twemoji, TWEMOJI_EMOJI_VERSION, localizeLabels()));

export function useEmojiContext(): ContextValue {
  const context = React.useContext(EmojiContext);
  const hydrating = useHydrating();
  const renderer = useRenderer(context ? "native" : "auto");
  return context ?? sharedValue(hydrating, renderer);
}

// A Root without a provider gets one around the shared store
export const SharedProvider = ({ children }: { children: React.ReactNode }) => <Provider store={useEmojiContext().store}>{children}</Provider>;

export const useEmojiStore = (): EmojiStore => useEmojiContext().store;

export const useEmojiLabels = (): EmojiLabels => useEmojiContext().labels;

export function useStoreSnapshot<T>(read: (store: EmojiStore) => T): T {
  const { store } = useEmojiContext();
  return useStore({ subscribe: store.subscribe, getSnapshot: () => read(store) });
}
