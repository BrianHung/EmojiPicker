import type * as React from "react";
import { apple } from "./apple/picker";
import { AppleScene } from "./apple/scene";
import { discord } from "./discord/picker";
import { DiscordScene } from "./discord/scene";
import { instagram } from "./instagram/picker";
import { InstagramScene } from "./instagram/scene";
import { linear } from "./linear/picker";
import { LinearScene } from "./linear/scene";
import { notion } from "./notion/picker";
import { NotionScene } from "./notion/scene";
import { slack } from "./slack/picker";
import { SlackScene } from "./slack/scene";
import type { Style } from "./style-picker";

export { StylePicker, type Style } from "./style-picker";

export const STYLES: Style[] = [apple, slack, discord, notion, linear, instagram];

export const styleById = (id: string) => STYLES.find((s) => s.id === id) ?? apple;

/** Each style's scene, by style id. */
export const SCENES: Record<string, React.ComponentType> = {
  apple: AppleScene,
  slack: SlackScene,
  discord: DiscordScene,
  notion: NotionScene,
  linear: LinearScene,
  instagram: InstagramScene,
};

const sources = import.meta.glob<string>("./*/*.tsx", { query: "?raw", import: "default", eager: true });

/** A style file as the site shows it ("apple", "picker" → styles/apple/picker.tsx), without maintainer comments. */
export const sourceOf = (id: string, file: "picker" | "scene") => stripComments(sources[`./${id}/${file}.tsx`] ?? "");

function stripComments(code: string) {
  return code
    .replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*\n/gm, "")
    .replace(/^[ \t]*\/\/.*\n/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trimStart();
}
