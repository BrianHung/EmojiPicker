"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { EmojiProvider, localeData, type EmojiLabels } from "emoji-components";

export function Providers({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation("emoji");
  const labels = React.useMemo<Partial<EmojiLabels>>(
    () => ({
      picker: t("picker"),
      searchPlaceholder: t("searchPlaceholder"),
      searchLabel: t("searchLabel"),
      searchClear: t("searchClear"),
      frequent: t("frequent"),
      resultCount: (count) => t("resultCount", { count }),
      withSkinTone: (name, tone) => t("withSkinTone", { name, tone }),
    }),
    [t],
  );
  return (
    <EmojiProvider data={localeData(i18n.language, { shortcodes: "cldr" })} locale={i18n.language} labels={labels}>
      {children}
    </EmojiProvider>
  );
}
