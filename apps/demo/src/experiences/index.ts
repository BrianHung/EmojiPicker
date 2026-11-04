import type * as React from "react";
import type { EmojiTypeaheadOptions } from "@brianhung/emoji-picker";
import { DiscordEmojiMenu, discordEmojiOptions } from "./discord";
import { LinearEmojiMenu, linearEmojiOptions } from "./linear";
import { NotionEmojiMenu, notionEmojiOptions } from "./notion";
import { SlackEmojiMenu, slackEmojiOptions } from "./slack";
import type { EmojiMenuProps } from "./suggestion-list";

export type { EmojiMenuProps } from "./suggestion-list";
export { DiscordEmojiMenu, LinearEmojiMenu, NotionEmojiMenu, SlackEmojiMenu };

export type Experience = { id: string; label: string; Menu: React.ComponentType<EmojiMenuProps>; options: EmojiTypeaheadOptions; below?: boolean };

export const EXPERIENCES: Experience[] = [
  { id: "slack", label: "Slack", Menu: SlackEmojiMenu, options: slackEmojiOptions },
  { id: "discord", label: "Discord", Menu: DiscordEmojiMenu, options: discordEmojiOptions },
  { id: "notion", label: "Notion", Menu: NotionEmojiMenu, options: notionEmojiOptions, below: true },
  { id: "linear", label: "Linear", Menu: LinearEmojiMenu, options: linearEmojiOptions },
];
