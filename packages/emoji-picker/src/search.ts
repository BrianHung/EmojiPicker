// `@brianhung/emoji-picker/search`: building blocks for the provider's `search` prop.
// A search is any `(query, context) => hits | Promise<hits>`; these are optional.
export { lexical, fallback, merge, rerank, preferFrequent, remote, fuse, indexFor } from "./core/search";
export type { EmojiSearch, SearchHit, SearchContext, Reranker, LexicalOptions } from "./core/search";
