import * as React from "react";
import { I18nProvider } from "react-aria-components/I18nProvider";
import { localizeLabels, type EmojiLabels } from "../../core/labels";
import { needsTwemoji, TWEMOJI_BASE_URL, TWEMOJI_EMOJI_VERSION, twemojiUrl, type Renderer } from "../../core/platform";
import { createEmojiStore, type EmojiStore, type EmojiStoreOptions } from "../../core/store";

export type { EmojiLabels };

export type EmojiProviderProps = EmojiStoreOptions & {
  renderer?: Renderer | "auto";
  twemojiBaseUrl?: string;
  twemojiVersion?: number;
  prepare?: boolean;
  labels?: Partial<EmojiLabels>;
  children: React.ReactNode;
};

type ContextValue = {
  store: EmojiStore;
  renderer: Renderer;
  imageUrl: (unified: string) => string;
  labels: EmojiLabels;
  groups: ReadonlyMap<string, string | undefined>;
  maxVersion?: number;
};

const EmojiContext = React.createContext<ContextValue | null>(null);

export function EmojiProvider({ renderer = "auto", twemojiBaseUrl = TWEMOJI_BASE_URL, twemojiVersion = TWEMOJI_EMOJI_VERSION, prepare = true, labels, locale, children, ...options }: EmojiProviderProps) {
  const [store] = React.useState(() => createEmojiStore({ ...options, locale, labels }));
  const { skinTone, onSkinToneChange } = options;
  React.useLayoutEffect(() => store.controlSkinTone(skinTone, onSkinToneChange), [store, skinTone, onSkinToneChange]);
  const [detected, setDetected] = React.useState<Renderer>("native");

  React.useEffect(() => {
    if (renderer === "auto") setDetected(needsTwemoji() ? "twemoji" : "native");
    if (prepare) store.prepare();
  }, [renderer, prepare, store]);

  const resolved = renderer === "auto" ? detected : renderer;
  const status = React.useSyncExternalStore(store.subscribe, store.status, store.status);
  const groups = React.useMemo(() => store.customGroups(), [store, status]);
  const merged = useLabels(labels, locale ?? (status === "ready" ? store.locale() : undefined));
  const value = React.useMemo<ContextValue>(
    () => ({
      store,
      renderer: resolved,
      imageUrl: (unified) => twemojiUrl(unified, twemojiBaseUrl),
      labels: merged,
      groups,
      maxVersion: resolved === "twemoji" ? twemojiVersion : undefined,
    }),
    [store, resolved, twemojiBaseUrl, twemojiVersion, merged, groups],
  );
  const tree = <EmojiContext.Provider value={value}>{children}</EmojiContext.Provider>;
  return locale ? <I18nProvider locale={locale}>{tree}</I18nProvider> : tree;
}

function useLabels(labels: Partial<EmojiLabels> | undefined, locale: string | undefined): EmojiLabels {
  const key = labels ? JSON.stringify(labels) : "";
  const latest = React.useRef(labels);
  latest.current = labels;
  return React.useMemo(() => localizeLabels(locale, latest.current), [key, locale, labels?.resultCount, labels?.withSkinTone]);
}

export function useEmojiContext(): ContextValue {
  const value = React.useContext(EmojiContext);
  if (!value) throw new Error("Emoji components and hooks must be used inside <EmojiProvider>.");
  return value;
}

export const useEmojiStore = () => useEmojiContext().store;

export function useStoreSnapshot<T>(read: (store: EmojiStore) => T): T {
  const { store } = useEmojiContext();
  return React.useSyncExternalStore(
    store.subscribe,
    () => read(store),
    () => read(store),
  );
}
