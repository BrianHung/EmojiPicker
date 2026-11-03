import * as React from "react";
import type { CustomEmoji } from "@brianhung/emoji-picker";

/** Pack fields the library is gaining (`base`, `animated`, intrinsic size); extra keys are ignored until then. */
export type PackEmoji = CustomEmoji & { base?: string; animated?: boolean; width?: number; height?: number };

const cache = new Map<string, Promise<PackEmoji[]>>();

/** Fetch a pack.json (CustomEmoji[]) once per URL; image URLs resolve against the pack's URL. */
export function loadPack(url: string): Promise<PackEmoji[]> {
  let pending = cache.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json().catch(() => {
          throw new Error(`not JSON (${res.headers.get("content-type") ?? "unknown type"})`);
        }) as Promise<unknown>;
      })
      .then((json) => {
        if (!Array.isArray(json)) throw new Error("Expected a JSON array of custom emoji");
        const base = new URL(url, location.href);
        return json.map((e, i) => {
          if (!e || typeof e.id !== "string" || typeof e.name !== "string" || typeof e.imageUrl !== "string")
            throw new Error(`Entry ${i} needs string id, name and imageUrl`);
          return { ...e, imageUrl: new URL(e.imageUrl, base).href } as PackEmoji;
        });
      });
    pending.catch(() => cache.delete(url));
    cache.set(url, pending);
  }
  return pending;
}

/**
 * Bufos from all-the-bufo (https://github.com/knobiknows/all-the-bufo), chosen by
 * scripts/pick-bufos.ts. That repository has no license, so this manifest only references
 * its images on their own host; none are copied into this repo.
 */
export const BUFO_PACK_URL = "/packs/bufo/pack.json";

/** A pack's emoji once loaded, else null. */
export function usePack(url: string) {
  const [pack, setPack] = React.useState<PackEmoji[] | null>(null);
  React.useEffect(() => {
    let live = true;
    loadPack(url).then((emoji) => live && setPack(emoji), () => live && setPack([]));
    return () => {
      live = false;
    };
  }, [url]);
  return pack;
}
