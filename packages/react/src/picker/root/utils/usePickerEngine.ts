"use client";

import * as React from "react";
import {
  type CollapsedCategoriesChangeDetails,
  createEmojiPicker,
  type EmojiPickerStore,
  type EmojiPickerOptions,
  type EmojiSelection,
  type EmojiStore,
  type HighlightChangeDetails,
  type QueryChangeDetails,
  type ReactionsOpenChangeDetails,
  type ValueChangeDetails,
} from "@emoji-components/core";
import { useStableCallback } from "../../../utils/useLatest";
import { useLayoutEffect } from "../../../utils/useLayoutEffect";

export type PickerEngineOptions = EmojiPickerOptions<React.ReactNode>;

// One headless picker for the component's life, as the AI SDK's useChat holds a Chat: values sync in a layout effect keyed on them, and callbacks are read at call time
export function usePickerEngine(store: EmojiStore, options: PickerEngineOptions): EmojiPickerStore<React.ReactNode> {
  const { labels, categories, frequent, emojiVersion, drawable, searchResults, searchLimit, query, collapsedCategories, highlight, value, disableVariations, reactions, reactionsOpen } = options;
  const onQueryChange = useStableCallback((value: string, details: QueryChangeDetails) => options.onQueryChange?.(value, details));
  const onHighlightChange = useStableCallback((unified: string | null, details: HighlightChangeDetails) => options.onHighlightChange?.(unified, details));
  const onCollapsedCategoriesChange = useStableCallback((ids: readonly string[], details: CollapsedCategoriesChangeDetails) => options.onCollapsedCategoriesChange?.(ids, details));
  const onSelect = useStableCallback((selection: EmojiSelection, details: ValueChangeDetails) => options.onSelect?.(selection, details));
  const onReactionsOpenChange = useStableCallback((open: boolean, details: ReactionsOpenChangeDetails) => options.onReactionsOpenChange?.(open, details));
  const stableValueChange = useStableCallback((unified: string | null, details: ValueChangeDetails) => options.onValueChange?.(unified, details));
  // Its presence tracks the value
  const onValueChange = options.onValueChange ? stableValueChange : undefined;
  const [picker] = React.useState(() => createEmojiPicker(store, { ...options, onQueryChange, onHighlightChange, onCollapsedCategoriesChange, onValueChange, onSelect, onReactionsOpenChange }));
  useLayoutEffect(
    () =>
      picker.setOptions({
        labels,
        categories,
        frequent,
        emojiVersion,
        drawable,
        searchResults,
        searchLimit,
        query,
        collapsedCategories,
        highlight,
        value,
        disableVariations,
        reactions,
        reactionsOpen,
        onQueryChange,
        onHighlightChange,
        onCollapsedCategoriesChange,
        onValueChange,
        onSelect,
        onReactionsOpenChange,
      }),
    [
      picker,
      labels,
      categories,
      frequent,
      emojiVersion,
      drawable,
      searchResults,
      searchLimit,
      query,
      collapsedCategories,
      highlight,
      value,
      disableVariations,
      reactions,
      reactionsOpen,
      onQueryChange,
      onHighlightChange,
      onCollapsedCategoriesChange,
      onValueChange,
      onSelect,
      onReactionsOpenChange,
    ],
  );
  return picker;
}
