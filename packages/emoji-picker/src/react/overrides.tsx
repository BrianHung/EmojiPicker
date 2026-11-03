// Scoped artwork: draw particular standard emoji with your own art in part of the
// UI (Apple's tapback hearts, a brand's thumbs up) while they stay the same emoji
// for selection, search and frequents.
import * as React from "react";
import { withoutTone } from "../core/dataset";
import { EmojiImage } from "./image";

/** An image URL, or any node (an inline SVG, a component). */
export type Artwork = string | React.ReactNode;
/** Artwork by unified code. A base code ("1f44d") covers every skin tone unless a toned key is given. */
export type ArtworkMap = Readonly<Record<string, Artwork>>;

const withoutFe0f = (unified: string) => unified.replace(/-fe0f/gi, "");

/**
 * The artwork for an emoji: its exact code, then without U+FE0F, then its base
 * (no skin tone), each with and without FE0F. Keys are matched case-insensitively.
 */
export function findArtwork(map: ArtworkMap, unified: string): Artwork | undefined {
  const code = unified.toLowerCase();
  const candidates = [code, withoutFe0f(code), withoutTone(code), withoutFe0f(withoutTone(code))];
  for (const key of candidates) {
    if (Object.prototype.hasOwnProperty.call(map, key)) return map[key];
  }
  // Keys written with FE0F where the emoji's code has none ("2764-fe0f" for "2764").
  for (const key of Object.keys(map)) {
    const bare = withoutFe0f(key.toLowerCase());
    if (bare === candidates[1] || bare === candidates[3]) return map[key];
  }
  return undefined;
}

const ArtworkContext = React.createContext<ArtworkMap | null>(null);

export type EmojiOverridesProps = {
  artwork: ArtworkMap;
  children: React.ReactNode;
};

/** Draws these emoji with this artwork for everything inside. Nested scopes merge; the inner one wins. */
export function EmojiOverrides({ artwork, children }: EmojiOverridesProps) {
  const parent = React.useContext(ArtworkContext);
  const merged = React.useMemo(() => (parent ? { ...parent, ...lowerKeys(artwork) } : lowerKeys(artwork)), [parent, artwork]);
  return <ArtworkContext.Provider value={merged}>{children}</ArtworkContext.Provider>;
}

function lowerKeys(map: ArtworkMap): ArtworkMap {
  const out: Record<string, Artwork> = {};
  for (const [key, art] of Object.entries(map)) out[key.toLowerCase()] = art;
  return out;
}

/** Every override in scope (for lists that look up many emoji). */
export const useArtworkMap = (): ArtworkMap | null => React.useContext(ArtworkContext);

/** The artwork in scope for an emoji, if any. */
export function useArtwork(unified: string | undefined): Artwork | undefined {
  const map = React.useContext(ArtworkContext);
  return map && unified ? findArtwork(map, unified) : undefined;
}

/** Renders artwork at a size: an image (lazy, like every emoji image) or a node in a box. */
export function ArtworkGlyph({ art, alt, size, ...props }: { art: Artwork; alt: string; size: string | number } & Omit<React.HTMLAttributes<HTMLElement>, "children">) {
  if (typeof art === "string") return <EmojiImage {...props} src={art} alt={alt} size={size} animate />;
  return (
    <span {...props} aria-hidden style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, ...props.style }}>
      {art}
    </span>
  );
}
