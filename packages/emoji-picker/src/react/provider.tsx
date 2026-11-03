import * as React from "react";
import { needsTwemoji, TWEMOJI_BASE_URL, twemojiUrl, type Renderer } from "../core/platform";
import { createEmojiStore, type EmojiStore, type EmojiStoreOptions } from "../core/store";

export type EmojiProviderProps = EmojiStoreOptions & {
  /** "auto": native emoji, or Twemoji where the system can't draw flags (Windows). Default "auto". */
  renderer?: Renderer | "auto";
  /** Where Twemoji SVGs live (self-host jdecked/twemoji assets/svg). Default: pinned jsDelivr URL. */
  twemojiBaseUrl?: string;
  /** Start loading data and building the index in idle time on mount. Default true. */
  prepare?: boolean;
  labels?: Partial<EmojiLabels>;
  children: React.ReactNode;
};

export type EmojiLabels = { suggested: string; custom: string };

type ContextValue = {
  store: EmojiStore;
  renderer: Renderer;
  imageUrl: (unified: string) => string;
  labels: EmojiLabels;
  groups: Map<string, string | undefined>;
};

const EmojiContext = React.createContext<ContextValue | null>(null);

/**
 * One store per app: dataset, search index, frequents and skin tone are
 * shared by every picker, tapback and autocomplete below it.
 */
export function EmojiProvider({ renderer = "auto", twemojiBaseUrl = TWEMOJI_BASE_URL, prepare = true, labels, children, ...options }: EmojiProviderProps) {
  // Options are read once, like a store; remount the provider to change data.
  const [store] = React.useState(() => createEmojiStore(options));
  const [detected, setDetected] = React.useState<Renderer>("native");

  React.useEffect(() => {
    if (renderer === "auto") setDetected(needsTwemoji() ? "twemoji" : "native");
    if (prepare) store.prepare();
  }, [renderer, prepare, store]);

  const resolved = renderer === "auto" ? detected : renderer;
  const groups = React.useMemo(() => new Map(store.customEmojis.map((c) => [c.id, c.group])), [store]);
  const value = React.useMemo<ContextValue>(
    () => ({
      store,
      renderer: resolved,
      imageUrl: (unified) => twemojiUrl(unified, twemojiBaseUrl),
      labels: { suggested: "Frequently used", custom: "Custom", ...labels },
      groups,
    }),
    [store, resolved, twemojiBaseUrl, labels?.suggested, labels?.custom, groups],
  );
  return <EmojiContext.Provider value={value}>{children}</EmojiContext.Provider>;
}

export function useEmojiContext(): ContextValue {
  const value = React.useContext(EmojiContext);
  if (!value) throw new Error("Emoji components and hooks must be used inside <EmojiProvider>.");
  return value;
}

/** The shared store, for imperative use (store.select, store.replaceShortcodes, ...). */
export const useEmojiStore = () => useEmojiContext().store;

/** Re-renders when the store's status or skin tone changes. */
export function useStoreSnapshot<T>(read: (store: EmojiStore) => T): T {
  const { store } = useEmojiContext();
  return React.useSyncExternalStore(
    store.subscribe,
    () => read(store),
    () => read(store),
  );
}
