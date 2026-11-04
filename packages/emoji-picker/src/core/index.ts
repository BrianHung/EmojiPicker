// Framework-agnostic entry: `@brianhung/emoji-picker/core`. No React, safe on the server.
export { createEmojiStore } from "./store";
export type { CustomEmoji, CustomEmojiLoader, CustomEmojiSource, EmojiDataSource, EmojiSelection, EmojiStore, EmojiStoreOptions, EmojiStoreStatus } from "./store";
export { createFrequencyStore, localStorageAdapter, memoryStorage, DEFAULT_FREQUENT } from "./frequents";
export type { FrequencyStorage, FrequencyStore, FrequencyStoreOptions } from "./frequents";
export { needsTwemoji, twemojiUrl, TWEMOJI_BASE_URL, TWEMOJI_EMOJI_VERSION } from "./platform";
export type { Renderer } from "./platform";
export type { Dataset, EmojiRecord, Group } from "./dataset";
export type { CompletionOrder, SearchIndex, SearchIndexOptions } from "./search-index";
export { createTokenizer, normalizer } from "./tokenize";
export type { Tokenizer, TokenizerOptions, WordSegmenter } from "./tokenize";
export { defaultLabels, plural } from "./labels";
export type { EmojiLabels, PluralForms, SkinToneNames } from "./labels";
export { nativeToUnified, resolveEmoji } from "./resolve";
export type { EmojiInput, EmojiLookup, ResolvedEmoji } from "./resolve";
export { splitWords } from "./custom";
export { createEmojiGrid, moveInGrid, rowsPerPage } from "./grid";
export type { EmojiGrid, EmojiGridMove, EmojiGridOptions, EmojiGridRow, EmojiGridSection } from "./grid";
export { findShortcodeTrigger, isComposingKey } from "./shortcodes";
