type PluralForms = { other: string } & Partial<Record<Intl.LDMLPluralRule | `=${number}`, string>>;

// The default resultCount; apps plug their own i18n library into labels.resultCount
export function plural(locale: string, forms: PluralForms): (count: number) => string {
  const rules = new Intl.PluralRules(locale);
  const number = new Intl.NumberFormat(locale);
  return (count) => {
    const form = forms[`=${count}`] ?? forms[rules.select(count)] ?? forms.other;
    return form.replaceAll("#", number.format(count));
  };
}

export type SkinToneNames = readonly [string, string, string, string, string, string];

export type EmojiLabels = {
  picker: string;
  searchPlaceholder: string;
  searchLabel: string;
  searchClear: string;
  searchResults: string;
  emojiList: string;
  resultCount: (count: number) => string;
  categoryNavigation: string;
  frequent: string;
  custom: string;
  suggestions: string;
  reactions: string;
  expandReactions: string;
  previewCaption: string;
  skinTone: string;
  skinTones: SkinToneNames;
  withSkinTone: (name: string, tone: number) => string;
};

const COUNT: PluralForms = { "=0": "No results", one: "# result", other: "# results" };

// English, with the app's overrides: a locale alone doesn't translate the strings, so it doesn't change their plural rules either
export function localizeLabels(overrides?: Partial<EmojiLabels>): EmojiLabels {
  return overrides ? { ...defaultLabels, ...overrides } : defaultLabels;
}

const TONE_SUFFIXES = ["light skin tone", "medium-light skin tone", "medium skin tone", "medium-dark skin tone", "dark skin tone"];

export const defaultLabels: EmojiLabels = {
  picker: "Emoji picker",
  searchPlaceholder: "Search",
  searchLabel: "Type to search for an emoji",
  searchClear: "Clear",
  searchResults: "Search results",
  emojiList: "Emoji",
  resultCount: plural("en", COUNT),
  categoryNavigation: "Category navigation",
  frequent: "Frequently used",
  custom: "Custom",
  suggestions: "Emoji suggestions",
  reactions: "Reactions",
  expandReactions: "More emoji",
  previewCaption: "Pick an emoji",
  skinTone: "Skin tone",
  skinTones: ["Default skin tone", "Light skin tone", "Medium-light skin tone", "Medium skin tone", "Medium-dark skin tone", "Dark skin tone"],
  withSkinTone: (name, tone) => `${name}: ${TONE_SUFFIXES[tone - 1]}`,
};
