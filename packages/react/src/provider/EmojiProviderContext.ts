"use client";

import * as React from "react";
import { createEmojiStore, type EmojiLabels, type EmojiStore, type Renderer, twemojiUrl } from "@brianhung/emoji-picker-core";
import { isUnified, localizeLabels, onNativeSupportChange, TWEMOJI_EMOJI_VERSION } from "@brianhung/emoji-picker-core/internal";
import { needsImageFallback } from "@brianhung/emoji-picker-core/native";
import { useStore } from "../utils/useStore";

export type ImageUrl = (unified: string, context: { renderer: Renderer }) => string | undefined;

export const twemoji: ImageUrl = (unified, { renderer }) => (renderer === "image" ? twemojiUrl(unified) : undefined);

export type EmojiProviderContext = {
  store: EmojiStore;
  renderer: Renderer;
  image(unified: string, renderer?: Renderer): string | undefined;
  labels: EmojiLabels;
  maxVersion?: number;
};

export const EmojiProviderContext = React.createContext<EmojiProviderContext | null>(null);

export const contextValue = (store: EmojiStore, renderer: Renderer, imageUrl: ImageUrl, imageVersion: number, labels: EmojiLabels): EmojiProviderContext => ({
  store,
  renderer,
  image: (unified, as = renderer) => (isUnified(unified) ? imageUrl(unified, { renderer: as }) : undefined),
  labels,
  maxVersion: renderer === "image" ? imageVersion : undefined,
});

const noop = () => () => {};
// True while hydrating (and on the server): storage then waits until after mount, so the first client render matches the server's
export const useHydrating = () =>
  React.useSyncExternalStore(
    noop,
    () => false,
    () => true,
  );

export function useRenderer(renderer: Renderer | "auto") {
  const [detected, setDetected] = React.useState<Renderer>("native");
  React.useEffect(() => {
    if (renderer !== "auto") return;
    const detect = () => setDetected(needsImageFallback() ? "image" : "native");
    detect();
    return onNativeSupportChange(detect);
  }, [renderer]);
  return renderer === "auto" ? detected : renderer;
}

let sharedStore: EmojiStore | undefined;
const shared: Partial<Record<Renderer, EmojiProviderContext>> = {};

// Everything outside an EmojiProvider shares one store, created on first use with the provider's defaults, so frequents and the skin tone agree
const sharedValue = (deferStorage: boolean, renderer: Renderer) => (shared[renderer] ??= contextValue((sharedStore ??= createEmojiStore({ deferStorage })), renderer, twemoji, TWEMOJI_EMOJI_VERSION, localizeLabels()));

export function useEmojiContext(): EmojiProviderContext {
  const context = React.useContext(EmojiProviderContext);
  const hydrating = useHydrating();
  const renderer = useRenderer(context ? "native" : "auto");
  return context ?? sharedValue(hydrating, renderer);
}

export function useStoreSnapshot<T>(read: (store: EmojiStore) => T): T {
  const { store } = useEmojiContext();
  return useStore({ subscribe: store.subscribe, getSnapshot: () => read(store) });
}
