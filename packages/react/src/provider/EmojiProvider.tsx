"use client";

import * as React from "react";
import { I18nProvider, useLocale } from "react-aria/I18nProvider";
import { createEmojiStore, type EmojiLabels, type EmojiStore, type EmojiStoreOptions, type FrequentsChangeDetails, type Renderer, type SkinToneChangeDetails } from "@emoji-components/core";
import { localizeLabels, TWEMOJI_EMOJI_VERSION } from "@emoji-components/core/internal";
import { useLayoutEffect } from "../utils/useLayoutEffect";
import { contextValue, EmojiProviderContext, type EmojiImageUrl, twemoji, useEmojiContext, useHydrating, useRenderer } from "./EmojiProviderContext";

export type EmojiProviderProps = Omit<EmojiStoreOptions, "deferStorage"> & {
  renderer?: Renderer | "auto";
  imageUrl?: EmojiImageUrl;
  imageVersion?: number;
  prepare?: boolean;
  children: React.ReactNode;
};

export function EmojiProvider(props: EmojiProviderProps) {
  const deferStorage = useHydrating();
  const [store] = React.useState(() => createEmojiStore({ ...props, deferStorage }));
  return <Provider {...props} store={store} />;
}

function Provider({ renderer = "auto", imageUrl = twemoji, imageVersion = TWEMOJI_EMOJI_VERSION, prepare = true, labels, locale, children, store, ...options }: EmojiProviderProps & { store: EmojiStore }) {
  const { skinTone, onSkinToneChange, frequents, onFrequentsChange, data, customEmojis, filter, search } = options;
  useLayoutEffect(
    () => store.setOptions({ data, customEmojis, filter, search, locale, skinTone, onSkinToneChange, frequents, onFrequentsChange }),
    [store, data, customEmojis, filter, search, locale, skinTone, onSkinToneChange, frequents, onFrequentsChange],
  );
  React.useEffect(() => void (prepare && store.prepare()), [prepare, store]);
  const resolved = useRenderer(renderer);
  const merged = useLabels(labels);
  const value = React.useMemo(() => contextValue(store, resolved, imageUrl, imageVersion, merged), [store, resolved, imageUrl, imageVersion, merged]);
  // React Aria's provider swaps components between a set and an unset locale, which would remount the tree
  const inherited = useLocale().locale;
  return (
    <I18nProvider locale={locale ?? inherited}>
      <EmojiProviderContext.Provider value={value}>{children}</EmojiProviderContext.Provider>
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

export declare namespace EmojiProvider {
  type Props = EmojiProviderProps;
  type SkinToneChangeEventReason = SkinToneChangeDetails["reason"];
  type SkinToneChangeEventDetails = SkinToneChangeDetails;
  type FrequentsChangeEventReason = FrequentsChangeDetails["reason"];
  type FrequentsChangeEventDetails = FrequentsChangeDetails;
}

// A Root without a provider gets one around the shared store
export const SharedProvider = ({ children }: { children: React.ReactNode }) => <Provider store={useEmojiContext().store}>{children}</Provider>;
