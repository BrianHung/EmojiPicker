// In-situ scenes: each app's emoji UI where it lives in that app, keyed by the app
// style ids in examples/index.ts (apple → the iMessage scene). Each scene expects an
// <EmojiProvider> above it (Discord brings its own, for Twemoji).
import type * as React from "react";
import { DiscordScene } from "./discord/scene";
import { IMessageScene } from "./imessage/scene";
import { InstagramScene } from "./instagram/scene";
import { LinearScene } from "./linear/scene";
import { NotionScene } from "./notion/scene";
import { SlackScene } from "./slack/scene";

export type Scene = { title: string; description: string; Scene: React.ComponentType };

export const SCENES: Record<string, Scene> = {
  apple: { title: "iMessage", description: "A conversation on iPhone: long-press or double-click a message for the tapback bar, and the emoji keyboard in the composer.", Scene: IMessageScene },
  slack: { title: "Slack", description: "A channel: :shortcodes: in messages, reaction pills, the hover toolbar's add reaction, and :shortcode autocomplete in the composer.", Scene: SlackScene },
  discord: { title: "Discord", description: "A text channel: reactions under a message, Add Reaction from the hover bar, and :smi autocomplete in the composer.", Scene: DiscordScene },
  notion: { title: "Notion", description: "A page: click the page icon to change it with the Notion style picker, and type : in the body for emoji suggestions.", Scene: NotionScene },
  linear: { title: "Linear", description: "An issue page: reactions from the smiley under the description, Linear pills on comments, : suggestions in the description and the comment box, and a team icon picker.", Scene: LinearScene },
  instagram: { title: "Instagram", description: "A group DM: hover a message to react from the reaction bar or the full picker; reactions show as chips under the bubble.", Scene: InstagramScene },
};
