// An emoji's skin-tone variations (Shift+Space on it, or a long press): a row of its
// six tones over the cell. Left/Right, Home and End move along it, Enter or Space picks,
// and Escape (or focus leaving) closes it, back to the emoji.
import * as React from "react";
import type { EmojiRecord } from "../core/dataset";
import { nameWithTone } from "../core/shortcodes";
import { usePicker } from "./context";
import { Glyph } from "./glyph";
import { mergeRefs, useKeyRegion } from "./keyboard";
import type { KeyboardAction } from "./keymap";
import { SLOTS } from "./slots";

export type VariationsProps = {
  record: EmojiRecord;
  /** Where it sits, in the Viewport's content box. */
  style: React.CSSProperties;
  onPick(unified: string): void;
  /** `restore`: focus goes back to the emoji (Escape, a pick); else it went elsewhere. */
  onClose(restore: boolean): void;
};

export function Variations({ record, style, onPick, onClose }: VariationsProps) {
  const { store, labels } = usePicker("EmojiPicker.List");
  const row = React.useRef<HTMLDivElement | null>(null);
  const variants = [record.unified, ...record.tones];
  const current = Math.max(0, variants.indexOf(store.withSkinTone(record.unified)));
  const options = () => [...(row.current?.querySelectorAll<HTMLElement>(`[data-slot="${SLOTS.emoji}"]`) ?? [])];
  React.useLayoutEffect(() => options()[current]?.focus({ preventScroll: true }), []);
  React.useEffect(() => {
    const outside = (e: Event) => !row.current?.contains(e.target as Node) && onClose(false);
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [onClose]);

  const region = useKeyRegion((action, event) => {
    const all = options();
    const i = all.indexOf(event.target as HTMLElement);
    if (i < 0) return "pass";
    const rtl = getComputedStyle(row.current!).direction === "rtl";
    const steps: Partial<Record<KeyboardAction, number>> = { "move-right": rtl ? -1 : 1, "move-left": rtl ? 1 : -1 };
    if (action === "close") onClose(true);
    else if (action === "select") onPick(variants[i]!);
    else if (action === "first" || action === "last") all[action === "first" ? 0 : all.length - 1]!.focus();
    else if (action && steps[action]) all[(i + steps[action]! + all.length) % all.length]!.focus();
    // Up and Down stay here rather than move the grid underneath.
    else if (action !== "move-up" && action !== "move-down") return "pass";
    return "handled";
  });

  return (
    <div
      ref={mergeRefs(row, region)}
      role="listbox"
      aria-label={labels.skinTone}
      aria-orientation="horizontal"
      data-slot={SLOTS.variations}
      style={style}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && onClose(false)}
    >
      {variants.map((unified, i) => (
        <div
          key={unified}
          role="option"
          aria-selected={i === current}
          aria-label={nameWithTone(record.name, unified, labels.withSkinTone)}
          tabIndex={i === current ? 0 : -1}
          data-slot={SLOTS.emoji}
          data-unified={unified}
          onClick={() => onPick(unified)}
        >
          <Glyph unified={unified} record={record} />
        </div>
      ))}
    </div>
  );
}
