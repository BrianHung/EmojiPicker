"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { EmojiProvider, type EmojiLabels } from "emoji-components";

export function Providers({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation("emoji");
  const labels = React.useMemo<EmojiLabels>(
    () => ({
      picker: t("picker"),
      searchPlaceholder: t("searchPlaceholder"),
      searchLabel: t("searchLabel"),
      searchClear: t("searchClear"),
      searchResults: t("searchResults"),
      emojiList: t("emojiList"),
      resultCount: (count) => t("resultCount", { count }),
      categoryNavigation: t("categoryNavigation"),
      frequent: t("frequent"),
      custom: t("custom"),
      suggestions: t("suggestions"),
      reactions: t("reactions"),
      expandReactions: t("expandReactions"),
      previewCaption: t("previewCaption"),
      skinTone: t("skinTone"),
      skinTones: [t("skinTones.0"), t("skinTones.1"), t("skinTones.2"), t("skinTones.3"), t("skinTones.4"), t("skinTones.5")],
      withSkinTone: (name, tone) => t("withSkinTone", { name, tone }),
    }),
    [t],
  );
  return (
    <EmojiProvider locale={i18n.language} labels={labels}>
      {children}
    </EmojiProvider>
  );
}
