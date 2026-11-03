/**
 * Plural forms keyed by CLDR category ("one", "few", "many", "other") or exact
 * count ("=0"); `#` is replaced with the count in the locale's digits.
 */
export type PluralForms = { other: string } & Partial<Record<Intl.LDMLPluralRule | `=${number}`, string>>;

/**
 * A count string for a locale: `plural("ru", { one: "# результат", few: "# результата", many: "# результатов", other: "# результата" })`.
 * Exact counts win over categories, as in ICU MessageFormat.
 */
export function plural(locale: string, forms: PluralForms): (count: number) => string {
  const rules = new Intl.PluralRules(locale);
  const number = new Intl.NumberFormat(locale);
  return (count) => {
    const form = forms[`=${count}`] ?? forms[rules.select(count)] ?? forms.other;
    return form.replaceAll("#", number.format(count));
  };
}

/** Skin tones 0 (none) through 5, as `SKIN_TONES` and `EmojiSelection.skinTone` number them. */
export type SkinToneNames = readonly [string, string, string, string, string, string];

/** Every string the library shows or announces. Category and emoji names come from the dataset. */
export type EmojiLabels = {
  /** Accessible name of the popover's dialog. */
  picker: string;
  /** Visible placeholder of the search input. */
  searchPlaceholder: string;
  /** Accessible name of the search input. */
  searchLabel: string;
  /** The search input's clear button. */
  searchClear: string;
  /** Accessible name of the result grid while searching. */
  searchResults: string;
  /** Accessible name of an emoji list that isn't showing search results. */
  emojiList: string;
  /** Live-region announcement of how many results a query found. */
  resultCount: (count: number) => string;
  /** The visible empty state. */
  noResults: string;
  /** Accessible name of the category tabs. */
  categoryNavigation: string;
  /** Section names the dataset doesn't have. */
  suggested: string;
  custom: string;
  /** Accessible name of a tapback's reaction bar, and its button that opens the full picker. */
  reactions: string;
  expandReactions: string;
  /** The preview's caption when no emoji is highlighted. */
  previewCaption: string;
  loading: string;
  loadingError: string;
  retryLoading: string;
  /** Accessible name of the skin tone picker. */
  skinTone: string;
  /** Skin tone options, as standalone names. */
  skinTones: SkinToneNames;
  /** An emoji variation's accessible name: "thumbs up: medium skin tone". `tone` is 1-5. */
  withSkinTone: (name: string, tone: number) => string;
};

const TONE_SUFFIXES = ["light skin tone", "medium-light skin tone", "medium skin tone", "medium-dark skin tone", "dark skin tone"];

/** English. Spread a translation over it: `{ ...defaultLabels, ...ja }`. */
export const defaultLabels: EmojiLabels = {
  picker: "Emoji picker",
  searchPlaceholder: "Search",
  searchLabel: "Type to search for an emoji",
  searchClear: "Clear",
  searchResults: "Search results",
  emojiList: "Emoji",
  resultCount: plural("en", { "=0": "No results", one: "# result", other: "# results" }),
  noResults: "No results found",
  categoryNavigation: "Category navigation",
  suggested: "Frequently used",
  custom: "Custom",
  reactions: "Reactions",
  expandReactions: "More emoji",
  previewCaption: "What's your mood?",
  loading: "Loading…",
  loadingError: "Could not load emojis.",
  retryLoading: "Try again",
  skinTone: "Skin tone",
  skinTones: ["Default skin tone", "Light skin tone", "Medium-light skin tone", "Medium skin tone", "Medium-dark skin tone", "Dark skin tone"],
  // emojibase's form for variations, so English names match the dataset's.
  withSkinTone: (name, tone) => `${name}: ${TONE_SUFFIXES[tone - 1]}`,
};
