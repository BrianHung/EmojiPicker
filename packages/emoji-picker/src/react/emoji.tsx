import * as React from "react";
import { isUnified } from "../core/dataset";
import type { Renderer } from "../core/platform";
import { nameWithTone } from "../core/shortcodes";
import { missingEmojiText, resolveEmoji, type EmojiInput, type ResolvedEmoji } from "../core/resolve";
import { EmojiImage } from "./image";
import { ArtworkGlyph, useArtwork } from "./overrides";
import { useEmojiContext, useStoreSnapshot } from "./provider";

type BaseProps = Omit<React.HTMLAttributes<HTMLElement>, "children"> & {
  /** Pixel size for image renderers; native text follows font-size. */
  size?: number;
  /** Draw with this renderer instead of the provider's (e.g. Twemoji for one product's UI). */
  renderer?: Renderer;
  /** Play an animated custom emoji. Default true; never with reduced motion. */
  animate?: boolean;
  /** Purely decorative (next to text that names it): hidden from assistive technology. */
  decorative?: boolean;
};

export type EmojiProps = BaseProps &
  (
    | {
        /** "🎉", ":tada:", "tada", "1f389", a custom id, a CustomEmoji, an EmojiRecord or an EmojiSelection. */
        emoji: EmojiInput;
        unified?: never;
      }
    | {
        /** @deprecated Use `emoji`, which also takes unified codes. */
        unified: string;
        emoji?: never;
      }
  );

/**
 * The emoji an input names, resolved against the provider's data (null when unknown).
 * Re-resolves once the data loads, so shortcodes and custom ids work on first render.
 */
export function useEmoji(input: EmojiInput): ResolvedEmoji | null {
  const { store } = useEmojiContext();
  const status = useStoreSnapshot((s) => s.status());
  const resolved = React.useMemo(() => resolveEmoji(store, input), [store, input, status]);
  // Shortcodes and custom ids need the data: load it if no picker has yet.
  React.useEffect(() => {
    if (!resolved && status === "idle") store.load().catch(() => {});
  }, [resolved, status, store]);
  return resolved;
}

/** One emoji, rendered the same way the pickers render it (native, Twemoji or custom image). */
export function Emoji({ emoji, unified, size, renderer: override, animate = true, decorative = false, ...props }: EmojiProps) {
  const context = useEmojiContext();
  const input: EmojiInput = emoji ?? unified ?? "";
  const resolved = useEmoji(input);
  const art = useArtwork(resolved?.unified);
  const status = useStoreSnapshot((s) => s.status());
  const renderer = override ?? context.renderer;

  if (!resolved) {
    // Before data loads a shortcode or custom id may still resolve: hold its space.
    if (status !== "ready" && status !== "error") {
      return <span {...props} aria-hidden data-emoji="" style={{ display: "inline-block", width: size ?? "1em", height: size ?? "1em", ...props.style }} />;
    }
    return (
      <span {...props} data-emoji="" data-emoji-missing="">
        {missingEmojiText(input)}
      </span>
    );
  }

  const name = nameWithTone(resolved.name, resolved.unified);
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
    // An unregistered CustomEmoji object has no record: lend it its own size and frames.
    const record = resolved.record ?? (typeof input === "object" && "id" in input ? { ...input, unified: input.id, emoji: "", tags: [], shortcodes: [], group: "custom" as const, version: 0, tones: [], order: 0 } : undefined);
    return <EmojiImage {...props} {...a11y} src={src} alt={decorative ? "" : name} record={record} size={size ?? "1em"} animate={animate} fallback={resolved.native || undefined} data-emoji="" />;
  }
  return (
    <span {...props} {...(decorative ? a11y : { role: "img", "aria-label": name })} data-emoji="" style={size === undefined ? props.style : { fontSize: size, lineHeight: 1, ...props.style }}>
      {resolved.native}
    </span>
  );
}
