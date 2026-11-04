import type * as React from "react";
import type { EmojiTypeahead, EmojiTypeaheadOptions } from "@brianhung/emoji-picker";
import { DiscordEmojiMenu, discordEmojiOptions } from "./discord";
import { LinearEmojiMenu, linearEmojiOptions } from "./linear";
import { NotionEmojiMenu, notionEmojiOptions } from "./notion";
import { SlackEmojiMenu, slackEmojiOptions } from "./slack";

/** A `:` menu for any editor's typeahead; `className` says where it docks (each app's default is measured against its composer). */
export type EmojiMenuProps = EmojiTypeahead & { className?: string };
export { DiscordEmojiMenu, LinearEmojiMenu, NotionEmojiMenu, SlackEmojiMenu };

export type Experience = { id: string; label: string; Menu: React.ComponentType<EmojiMenuProps>; options: EmojiTypeaheadOptions; below?: boolean };

export const EXPERIENCES: Experience[] = [
  { id: "slack", label: "Slack", Menu: SlackEmojiMenu, options: slackEmojiOptions },
  { id: "discord", label: "Discord", Menu: DiscordEmojiMenu, options: discordEmojiOptions },
  { id: "notion", label: "Notion", Menu: NotionEmojiMenu, options: notionEmojiOptions, below: true },
  { id: "linear", label: "Linear", Menu: LinearEmojiMenu, options: linearEmojiOptions },
];
