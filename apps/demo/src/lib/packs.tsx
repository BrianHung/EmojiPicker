import * as React from "react";
import type { CustomEmoji } from "@brianhung/emoji-picker";

const cache = new Map<string, Promise<CustomEmoji[]>>();

export function loadPack(url: string): Promise<CustomEmoji[]> {
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
          if (!e || typeof e.id !== "string" || typeof e.name !== "string" || typeof e.imageUrl !== "string") throw new Error(`Entry ${i} needs string id, name and imageUrl`);
          return { ...e, imageUrl: new URL(e.imageUrl, base).href } as CustomEmoji;
        });
      });
    pending.catch(() => cache.delete(url));
    cache.set(url, pending);
  }
  return pending;
}

// all-the-bufo has no license: the manifest only references images on their own host, none are copied here
export const BUFO_PACK_URL = "/packs/bufo/pack.json";

export function usePack(url: string) {
  const [pack, setPack] = React.useState<CustomEmoji[] | null>(null);
  React.useEffect(() => {
    let live = true;
    loadPack(url).then(
      (emoji) => live && setPack(emoji),
      () => live && setPack([]),
    );
    return () => {
      live = false;
    };
  }, [url]);
  return pack;
}
