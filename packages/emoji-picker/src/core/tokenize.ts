/** Splits text into normalized search words. The index and queries share one, so they agree. */
export type Tokenizer = (text: string) => string[];

/** The part of `Intl.Segmenter` the tokenizer uses. Any object of this shape works (a dictionary segmenter, a WASM one). */
export type WordSegmenter = { segment(text: string): Iterable<{ segment: string; isWordLike?: boolean }> };

export type TokenizerOptions = {
  /** BCP 47 tag for case folding and word segmentation: "ja", "tr", "zh-Hant". Default: the runtime's. */
  locale?: string;
  /**
   * Finds words in text written without spaces (Japanese, Chinese, Thai). Default
   * `new Intl.Segmenter(locale, { granularity: "word" })` where the runtime has it;
   * `false` splits on spaces and punctuation only.
   */
  segmenter?: WordSegmenter | false;
};

const SEPARATORS = /[\s_\-:,.()]+/;
// ASCII runs are split by SEPARATORS alone, so English tokens don't depend on ICU.
const NON_ASCII = /[^\x00-\x7f]/;

/** A locale tag the runtime accepts, or undefined (an invalid tag would make Intl throw). */
export function canonicalLocale(locale: string | undefined): string | undefined {
  if (!locale) return undefined;
  try {
    return Intl.getCanonicalLocales(locale)[0];
  } catch {
    return undefined;
  }
}

/** NFKC, then lowercase in `locale`: "ＦＩＲＥ" → "fire", and in Turkish "İ" → "i". */
export function normalizer(locale?: string): (text: string) => string {
  const tag = canonicalLocale(locale);
  return tag ? (text) => text.normalize("NFKC").toLocaleLowerCase(tag) : (text) => text.normalize("NFKC").toLowerCase();
}

function defaultSegmenter(locale: string | undefined): WordSegmenter | false {
  return typeof Intl.Segmenter === "function" ? new Intl.Segmenter(locale, { granularity: "word" }) : false;
}

/** A tokenizer: normalize, split on spaces and punctuation, then segment what isn't ASCII into words. */
export function createTokenizer({ locale, segmenter }: TokenizerOptions = {}): Tokenizer {
  const tag = canonicalLocale(locale);
  const normalize = normalizer(tag);
  const words = segmenter ?? defaultSegmenter(tag);
  return (text) => {
    const tokens: string[] = [];
    for (const piece of normalize(text).split(SEPARATORS)) {
      if (!piece) continue;
      if (!words || !NON_ASCII.test(piece)) {
        tokens.push(piece);
        continue;
      }
      for (const { segment, isWordLike } of words.segment(piece)) if (isWordLike ?? segment.trim()) tokens.push(segment);
    }
    return tokens;
  };
}

const shared = new Map<string, Tokenizer>();

/** The default tokenizer for a locale, one instance per locale (search indexes are cached by tokenizer). */
export function tokenizerFor(locale?: string): Tokenizer {
  const key = canonicalLocale(locale) ?? "";
  let tokenizer = shared.get(key);
  if (!tokenizer) shared.set(key, (tokenizer = createTokenizer({ locale: key || undefined })));
  return tokenizer;
}
