import * as React from "react";
import { isUnified, unifiedToNative } from "../core/dataset";
import type { Renderer } from "../core/platform";
import { useEmojiContext } from "./provider";

export type EmojiProps = Omit<React.HTMLAttributes<HTMLElement>, "children"> & {
  /** Unified code ("1f44d", "1f44d-1f3fd") or a custom emoji id. */
  unified: string;
  /** Pixel size for image renderers; native text follows font-size. */
  size?: number;
  /** Draw with this renderer instead of the provider's (e.g. Twemoji for one product's UI). */
  renderer?: Renderer;
};

/** One emoji, rendered the same way the pickers render it (native, Twemoji or custom image). */
export function Emoji({ unified, size, renderer: override, ...props }: EmojiProps) {
  const context = useEmojiContext();
  const { store, imageUrl } = context;
  const renderer = override ?? context.renderer;
  const record = store.get(unified);
  const label = record?.name ?? unified;
  // A custom emoji id before data loads (or an unknown one): keep the space, render nothing.
  if (!record?.imageUrl && !isUnified(unified)) {
    return <span {...props} role="img" aria-label={label} data-emoji="" style={{ display: "inline-block", width: size ?? "1em", height: size ?? "1em", ...props.style }} />;
  }
  const src = record?.imageUrl ?? (renderer === "twemoji" ? imageUrl(unified) : undefined);
  if (src) {
    return <img {...props} src={src} alt={record?.imageUrl ? `:${record.shortcodes[0] ?? record.name}:` : unifiedToNative(unified)} aria-label={label} width={size} height={size} draggable={false} data-emoji="" />;
  }
  return (
    <span {...props} role="img" aria-label={label} data-emoji="">
      {unifiedToNative(unified)}
    </span>
  );
}
