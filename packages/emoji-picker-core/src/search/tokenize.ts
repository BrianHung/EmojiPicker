import { cached } from "../reactive";

export type Tokenizer = (text: string) => string[];

export type WordSegmenter = { segment(text: string): Iterable<{ segment: string; isWordLike?: boolean }> };

export type TokenizerOptions = {
  locale?: string;
  segmenter?: WordSegmenter | false;
};

const SEPARATORS = /[\s_\-:,.()]+/;
const NON_ASCII = /[^\x00-\x7f]/;

export function canonicalLocale(locale: string | undefined): string | undefined {
  if (!locale) return undefined;
  try {
    return Intl.getCanonicalLocales(locale)[0];
  } catch {
    return undefined;
  }
}

export function normalizer(locale?: string): (text: string) => string {
  const tag = canonicalLocale(locale);
  return tag ? (text) => text.normalize("NFKC").toLocaleLowerCase(tag) : (text) => text.normalize("NFKC").toLowerCase();
}

function defaultSegmenter(locale: string | undefined): WordSegmenter | false {
  return typeof Intl.Segmenter === "function" ? new Intl.Segmenter(locale, { granularity: "word" }) : false;
}

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

export function tokenizerFor(locale?: string): Tokenizer {
  const key = canonicalLocale(locale) ?? "";
  return cached(shared, key, () => createTokenizer({ locale: key || undefined }));
}
