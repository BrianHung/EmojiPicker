// `@brianhung/emoji-picker/search`: building blocks for the provider's `search` prop.
// A search is any `(query, context) => hits | Promise<hits>`; these are optional.
export { lexical, fallback, merge, rerank, preferFrequent, progressive, remote, fuse, indexFor, withInterim } from "./core/search";
export type { EmojiSearch, SearchHit, SearchContext, Reranker, LexicalOptions, ProgressiveHits } from "./core/search";
export { createTokenizer, normalizer } from "./core/tokenize";
export type { Tokenizer, TokenizerOptions, WordSegmenter } from "./core/tokenize";
