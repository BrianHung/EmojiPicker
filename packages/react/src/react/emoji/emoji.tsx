import * as React from "react";
import { resolveEmoji } from "@brianhung/emoji-picker-core";
import { customRecord, type EmojiInput, isCustomEmoji, missingEmojiText, nameWithTone, type Renderer, type ResolvedEmoji } from "@brianhung/emoji-picker-core/internal";
import { EmojiImage, NATIVE } from "./image";
import { useEmojiContext, useStoreSnapshot } from "../provider/provider";
import { SLOTS } from "../utils/slots";

type BaseProps = Omit<React.HTMLAttributes<HTMLElement>, "children"> & {
  size?: number;
  renderer?: Renderer;
  animate?: boolean;
};

export type EmojiProps = BaseProps & {
  emoji: EmojiInput;
};

export declare namespace Emoji {
  type Props = EmojiProps;
}

export function useEmoji(input: EmojiInput): ResolvedEmoji | null {
  const { store } = useEmojiContext();
  const status = useStoreSnapshot((s) => s.status());
  const version = useStoreSnapshot((s) => s.version());
  // biome-ignore lint/correctness/useExhaustiveDependencies: the store is mutable; its version changes with the records resolveEmoji reads
  const resolved = React.useMemo(() => resolveEmoji(store, input), [store, input, version]);
  React.useEffect(() => {
    if (!resolved && status === "idle") store.load().catch(() => {});
  }, [resolved, status, store]);
  return resolved;
}

export const Emoji = React.forwardRef<HTMLElement, EmojiProps>(function Emoji({ emoji: input, size, renderer: override, animate = true, ...rest }, ref) {
  const props = { ...rest, ref, "data-slot": SLOTS.emojiElement };
  const context = useEmojiContext();
  const resolved = useEmoji(input);
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
  const hidden = props["aria-hidden"] === true || props["aria-hidden"] === "true";
  const src = resolved.imageUrl ?? context.image(resolved.unified, renderer);
  if (src) {
    const record = resolved.record ?? (typeof input === "object" && isCustomEmoji(input) ? customRecord(input) : undefined);
    return (
      <EmojiImage
        {...props}
        src={src}
        alt={hidden ? "" : name}
        record={record}
        size={size ?? "1em"}
        animate={animate}
        fallback={resolved.native || undefined}
        data-emoji=""
        data-overridden={!resolved.imageUrl && renderer === "native" ? "" : undefined}
      />
    );
  }
  return (
    <span {...props} {...(hidden ? {} : { role: "img", "aria-label": name })} data-emoji="" style={{ ...NATIVE, width: "1em", height: "1em", fontSize: size, ...props.style }}>
      {resolved.native}
    </span>
  );
});
