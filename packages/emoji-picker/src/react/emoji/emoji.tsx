import * as React from "react";
import { type EmojiInput, isUnified, missingEmojiText, nameWithTone, type Renderer, type ResolvedEmoji, resolveEmoji } from "@brianhung/emoji-picker-core";
import { EmojiImage } from "./image";
import { ArtworkGlyph, useArtwork } from "./overrides";
import { useEmojiContext, useStoreSnapshot } from "../provider/provider";

type BaseProps = Omit<React.HTMLAttributes<HTMLElement>, "children"> & {
  size?: number;
  renderer?: Renderer;
  animate?: boolean;
  decorative?: boolean;
};

export type EmojiProps = BaseProps & {
  emoji: EmojiInput;
};

export function useEmoji(input: EmojiInput): ResolvedEmoji | null {
  const { store } = useEmojiContext();
  const status = useStoreSnapshot((s) => s.status());
  const resolved = React.useMemo(() => resolveEmoji(store, input), [store, input, status]);
  React.useEffect(() => {
    if (!resolved && status === "idle") store.load().catch(() => {});
  }, [resolved, status, store]);
  return resolved;
}

export function Emoji({ emoji: input, size, renderer: override, animate = true, decorative = false, ...props }: EmojiProps) {
  const context = useEmojiContext();
  const resolved = useEmoji(input);
  const art = useArtwork(resolved?.unified);
  const status = useStoreSnapshot((s) => s.status());
  const renderer = override ?? context.renderer;

  if (!resolved) {
    if (status !== "ready" && status !== "error") {
      return <span {...props} aria-hidden data-emoji="" style={{ display: "inline-block", width: size ?? "1em", height: size ?? "1em", ...props.style }} />;
    }
    return (
      <span {...props} data-emoji="" data-emoji-missing="">
        {missingEmojiText(input)}
      </span>
    );
  }

  const name = nameWithTone(resolved.name, resolved.unified, context.labels.withSkinTone);
  const a11y = decorative ? { "aria-hidden": true } : {};
  if (art !== undefined) {
    if (typeof art === "string") return <ArtworkGlyph {...props} {...a11y} art={art} alt={decorative ? "" : name} size={size ?? "1em"} data-emoji="" data-overridden="" />;
    return (
      <span {...props} {...(decorative ? a11y : { role: "img", "aria-label": name })} data-emoji="" data-overridden="" style={{ display: "inline-flex", ...props.style }}>
        <ArtworkGlyph art={art} alt="" size={size ?? "1em"} />
      </span>
    );
  }
  const src = resolved.imageUrl ?? (renderer === "twemoji" && isUnified(resolved.unified) ? context.imageUrl(resolved.unified) : undefined);
  if (src) {
    const record = resolved.record ?? (typeof input === "object" && "id" in input ? { ...input, unified: input.id, emoji: "", tags: [], shortcodes: [], group: "custom" as const, version: 0, tones: [], order: 0 } : undefined);
    return <EmojiImage {...props} {...a11y} src={src} alt={decorative ? "" : name} record={record} size={size ?? "1em"} animate={animate} fallback={resolved.native || undefined} data-emoji="" />;
  }
  return (
    <span {...props} {...(decorative ? a11y : { role: "img", "aria-label": name })} data-emoji="" style={size === undefined ? props.style : { fontSize: size, lineHeight: 1, ...props.style }}>
      {resolved.native}
    </span>
  );
}
