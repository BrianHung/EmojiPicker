import { cached } from "../reactive";

export type Tokenizer = (text: string) => string[];

export type WordSegmenter = { segment(text: string): Iterable<{ segment: string; isWordLike?: boolean }> };

export type TokenizerOptions = {
  locale?: string;
  segmenter?: WordSegmenter | false;
};

const SEPARATORS = /[\s_\-:,.()]+/;
const NON_ASCII = /[^\x00-\x7f]/;
const HIRAGANA = /[\u3041-\u3096\u309d\u309e]/g;
const HIRAGANA_ONLY = /^[\p{sc=Hiragana}\u30fc]+$/u;
const toKatakana = (text: string) => text.replace(HIRAGANA, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));

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
      // Kana folds to katakana, so ねこ finds ネコ; all-hiragana text folds before segmenting, which splits hiragana words it doesn't know (は|ー|と)
      for (const { segment, isWordLike } of words.segment(HIRAGANA_ONLY.test(piece) ? toKatakana(piece) : piece)) if (isWordLike ?? segment.trim()) tokens.push(toKatakana(segment));
    }
    return tokens;
  };
}

const shared = new Map<string, Tokenizer>();

export function tokenizerFor(locale?: string): Tokenizer {
  const key = canonicalLocale(locale) ?? "";
  return cached(shared, key, () => createTokenizer({ locale: key || undefined }));
}
