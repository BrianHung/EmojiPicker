import * as React from "react";
import { I18nProvider } from "react-aria-components/I18nProvider";
import { useStore } from "../utils/store";
import { createEmojiStore, type EmojiLabels, type EmojiStore, type EmojiStoreOptions, localizeLabels, needsImageFallback, onNativeSupportChange, type Renderer, TWEMOJI_EMOJI_VERSION, twemojiUrl } from "@brianhung/emoji-picker-core";

export type { EmojiLabels };

export type EmojiProviderProps = EmojiStoreOptions & {
  renderer?: Renderer | "auto";
  imageUrl?: (unified: string) => string;
  imageVersion?: number;
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

export const EmojiContext = React.createContext<ContextValue | null>(null);

export function EmojiProvider({ renderer = "auto", imageUrl = twemojiUrl, imageVersion = TWEMOJI_EMOJI_VERSION, prepare = true, labels, locale, children, ...options }: EmojiProviderProps) {
  const [store] = React.useState(() => createEmojiStore({ ...options, locale, labels }));
  const { skinTone, onSkinToneChange, data, customEmojis, filter, searchEngine } = options;
  React.useLayoutEffect(() => store.controlSkinTone(skinTone, onSkinToneChange), [store, skinTone, onSkinToneChange]);
  React.useLayoutEffect(() => store.setOptions({ data, customEmojis, filter, searchEngine, locale }), [store, data, customEmojis, filter, searchEngine, locale]);
  const [detected, setDetected] = React.useState<Renderer>("native");

  React.useEffect(() => {
    const detect = () => setDetected(needsImageFallback() ? "image" : "native");
    if (renderer === "auto") detect();
    if (prepare) store.prepare();
    return renderer === "auto" ? onNativeSupportChange(detect) : undefined;
  }, [renderer, prepare, store]);

  const resolved = renderer === "auto" ? detected : renderer;
  const groups = useStore(store, (s) => s.data.customGroups);
  const loadedLocale = useStore(store, (s) => (s.status === "ready" ? s.data.locale : undefined));
  const merged = useLabels(labels, locale ?? loadedLocale);
  const value = React.useMemo<ContextValue>(
    () => ({
      store,
      renderer: resolved,
      imageUrl,
      labels: merged,
      groups,
      maxVersion: resolved === "image" ? imageVersion : undefined,
    }),
    [store, resolved, imageUrl, imageVersion, merged, groups],
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
  return useStore(store, () => read(store));
}
