import * as React from "react";
import { createEmojiPicker, type CollapsedCategoriesChangeDetails, type EmojiPicker, type EmojiPickerOptions, type EmojiStore, type HighlightChangeDetails, type QueryChangeDetails } from "@brianhung/emoji-picker-core";
import { useStableCallback } from "../utils/latest";
import { useLayoutEffect } from "../utils/utils";

export type PickerEngineOptions = EmojiPickerOptions<React.ReactNode>;

// One headless picker for the component's life, as the AI SDK's useChat holds a Chat: values sync in a layout effect keyed on them, and callbacks are read at call time
export function usePickerEngine(store: EmojiStore, options: PickerEngineOptions): EmojiPicker<React.ReactNode> {
  const { labels, categories, frequent, suggested, emojiVersion, searchResults, searchLimit, query, collapsedCategories, highlight, disableVariations, reactions } = options;
  const onQueryChange = useStableCallback((value: string, details: QueryChangeDetails) => options.onQueryChange?.(value, details));
  const onHighlightChange = useStableCallback((unified: string | null, details: HighlightChangeDetails) => options.onHighlightChange?.(unified, details));
  const onCollapsedCategoriesChange = useStableCallback((ids: readonly string[], details: CollapsedCategoriesChangeDetails) => options.onCollapsedCategoriesChange?.(ids, details));
  const [picker] = React.useState(() => createEmojiPicker(store, { ...options, onQueryChange, onHighlightChange, onCollapsedCategoriesChange }));
  useLayoutEffect(
    () =>
      picker.setOptions({
        labels,
        categories,
        frequent,
        suggested,
        emojiVersion,
        searchResults,
        searchLimit,
        query,
        collapsedCategories,
        highlight,
        disableVariations,
        reactions,
        onQueryChange,
        onHighlightChange,
        onCollapsedCategoriesChange,
      }),
    [picker, labels, categories, frequent, suggested, emojiVersion, searchResults, searchLimit, query, collapsedCategories, highlight, disableVariations, reactions, onQueryChange, onHighlightChange, onCollapsedCategoriesChange],
  );
  return picker;
}
