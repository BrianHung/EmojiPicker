import * as React from "react";
import { type EmojiRecord, nameWithTone } from "@brianhung/emoji-picker-core";
import { usePicker } from "../root/context";
import { Glyph } from "../emoji/glyph";
import { mergeRefs } from "react-aria/mergeRefs";
import { useKeyRegion } from "../root/keyboard";
import type { KeyboardAction } from "../root/keymap";
import { SLOTS } from "../utils/slots";

type VariationsProps = {
  record: EmojiRecord;
  style: React.CSSProperties;
  onPick(unified: string): void;
  onClose(restore: boolean): void;
};

const ROW: React.CSSProperties = { zIndex: 4, display: "flex", background: "var(--emoji-picker-background, Canvas)", borderRadius: "var(--emoji-picker-radius, 8px)", boxShadow: "var(--emoji-picker-shadow, 0 4px 12px rgb(0 0 0 / 0.15))" };
const OPTION: React.CSSProperties = { position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "var(--ep-cell)", height: "var(--ep-cell)", overflow: "hidden", cursor: "default" };

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
    else if (action !== "move-up" && action !== "move-down") return "pass";
    return "handled";
  });

  return (
    <div
      ref={mergeRefs<HTMLDivElement>(row, region)}
      role="listbox"
      aria-label={labels.skinTone}
      aria-orientation="horizontal"
      data-slot={SLOTS.variations}
      style={{ ...ROW, ...style }}
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
          style={OPTION}
          onClick={() => onPick(unified)}
        >
          <Glyph unified={unified} record={record} />
        </div>
      ))}
    </div>
  );
}
