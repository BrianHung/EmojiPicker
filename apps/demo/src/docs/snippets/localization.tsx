import { EmojiProvider, localeData, type EmojiLabels } from "emoji-components";

const labels: Partial<EmojiLabels> = {
  picker: "絵文字ピッカー",
  searchPlaceholder: "検索",
  searchLabel: "絵文字を検索",
  searchClear: "クリア",
  searchResults: "検索結果",
  emojiList: "絵文字",
  resultCount: (count) => (count ? `${count}件` : "見つかりません"),
  categoryNavigation: "カテゴリ",
  suggested: "よく使う絵文字",
  custom: "カスタム",
  reactions: "リアクション",
  expandReactions: "その他の絵文字",
  previewCaption: "今の気分は？",
  skinTone: "肌の色",
  skinTones: ["標準", "明るい肌色", "やや明るい肌色", "中間の肌色", "やや濃い肌色", "濃い肌色"],
  withSkinTone: (name, tone) => `${name}: ${["明るい肌色", "やや明るい肌色", "中間の肌色", "やや濃い肌色", "濃い肌色"][tone - 1]}`,
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <EmojiProvider data={localeData("ja", { shortcodes: "cldr" })} locale="ja" labels={labels}>
      {children}
    </EmojiProvider>
  );
}
