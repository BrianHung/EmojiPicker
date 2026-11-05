import * as React from "react";
import { withoutTone } from "@brianhung/emoji-picker-core";
import { EmojiImage } from "./image";

export type Artwork = string | React.ReactNode;
export type ArtworkMap = Readonly<Record<string, Artwork>>;

const withoutFe0f = (unified: string) => unified.replace(/-fe0f/gi, "");

export function findArtwork(map: ArtworkMap, unified: string): Artwork | undefined {
  const code = unified.toLowerCase();
  const candidates = [code, withoutFe0f(code), withoutTone(code), withoutFe0f(withoutTone(code))];
  for (const key of candidates) {
    if (Object.hasOwn(map, key)) return map[key];
  }
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

export const useArtworkMap = (): ArtworkMap | null => React.useContext(ArtworkContext);

export function useArtwork(unified: string | undefined): Artwork | undefined {
  const map = React.useContext(ArtworkContext);
  return map && unified ? findArtwork(map, unified) : undefined;
}

export function ArtworkGlyph({ art, alt, size, ...props }: { art: Artwork; alt: string; size: string | number } & Omit<React.HTMLAttributes<HTMLElement>, "children">) {
  if (typeof art === "string") return <EmojiImage {...props} src={art} alt={alt} size={size} animate />;
  return (
    <span {...props} aria-hidden style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, ...props.style }}>
      {art}
    </span>
  );
}
