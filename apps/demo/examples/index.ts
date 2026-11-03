// The examples, in page order, plus each file's source text for the code panels.
import { apple } from "./apple";
import { classic } from "./classic";
import { discord } from "./discord";
import { instagram } from "./instagram";
import type { Skin } from "./kit";
import { linear } from "./linear";
import { notion } from "./notion";
import { slack } from "./slack";

/** The skins the site renders, in page order. */
export const SKINS: Skin[] = [apple, slack, discord, notion, linear, instagram];

/** Off the site, but still resolvable by id for the capture harness. */
const UNLISTED: Skin[] = [classic];

export const skinById = (id: string) => SKINS.find((s) => s.id === id) ?? UNLISTED.find((s) => s.id === id) ?? apple;

const sources = import.meta.glob("./*.tsx", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

/** Source of an example file ("apple" → ./apple.tsx), or of the shared kit/variants. */
export const sourceOf = (name: string) => sources[`./${name}.tsx`] ?? "";

export { SkinPicker, type Skin } from "./kit";
