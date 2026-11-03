import type { CustomEmoji } from "@brianhung/emoji-picker";

/** Self-contained custom emoji images (data URIs), standing in for your team's uploads. */
export const badge = (label: string, bg: string, fg = "#fff") =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${bg}"/><text x="32" y="42" font-family="system-ui,sans-serif" font-size="${label.length > 2 ? 20 : 28}" font-weight="700" text-anchor="middle" fill="${fg}">${label}</text></svg>`,
  )}`;

export const TEAM_EMOJI: CustomEmoji[] = [
  { id: "ship-it", name: "ship it", imageUrl: badge("🚢", "#2563eb"), shortcodes: ["shipit", "ship_it"], group: "Team" },
  { id: "lgtm", name: "looks good to me", imageUrl: badge("LGTM", "#16a34a"), shortcodes: ["lgtm"], group: "Team" },
  { id: "nit", name: "nit", imageUrl: badge("nit", "#a855f7"), shortcodes: ["nit"], group: "Team" },
  { id: "plus-one-k", name: "plus one thousand", imageUrl: badge("+1k", "#f59e0b", "#111"), shortcodes: ["plus1000"], group: "Team" },
  { id: "on-call", name: "on call", imageUrl: badge("📟", "#dc2626"), shortcodes: ["oncall"], group: "Status" },
  { id: "ooo", name: "out of office", imageUrl: badge("OOO", "#475569"), shortcodes: ["ooo"], group: "Status" },
  { id: "focus", name: "focus time", imageUrl: badge("🎧", "#0d9488"), shortcodes: ["focus"], group: "Status" },
];

