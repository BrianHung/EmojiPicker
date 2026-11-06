export type DatasetEmoji = [unified: string, name: string, tags: string[], shortcodes: string[], group: number, version: number, hasTones: 0 | 1];

export type Dataset = {
  format: 1;
  locale: string;
  emojibase: string;
  groups: string[];
  emojis: DatasetEmoji[];
  toneExceptions: Record<string, string[]>;
};
