import * as React from "react";
import { type EmojiRecord, nameWithTone } from "@brianhung/emoji-picker-core";
import { usePicker } from "../root/context";
import { Glyph } from "../emoji/glyph";
import { FocusScope, useFocusManager } from "react-aria/FocusScope";
import { useLocale } from "react-aria/I18nProvider";
import { mergeRefs } from "react-aria/mergeRefs";
import { useInteractOutside } from "react-aria/useInteractOutside";
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

export function Variations(props: VariationsProps) {
  return (
    <FocusScope autoFocus>
      <VariationsRow {...props} />
    </FocusScope>
  );
}

function VariationsRow({ record, style, onPick, onClose }: VariationsProps) {
  const { store, labels } = usePicker("EmojiPicker.List");
  const row = React.useRef<HTMLDivElement | null>(null);
  const focus = useFocusManager();
  const rtl = useLocale().direction === "rtl";
  const variants = [record.unified, ...record.tones];
  const current = Math.max(0, variants.indexOf(store.withSkinTone(record.unified)));
  const dismiss = () => onClose(false);
  useInteractOutside({ ref: row, onInteractOutsideStart: dismiss, onInteractOutside: dismiss });

  const region = useKeyRegion((action, event) => {
    const unified = event.target instanceof HTMLElement ? event.target.dataset.unified : undefined;
    if (unified === undefined || !variants.includes(unified)) return "pass";
    const steps: Partial<Record<KeyboardAction, number>> = { "move-right": rtl ? -1 : 1, "move-left": rtl ? 1 : -1 };
    const step = action ? steps[action] : undefined;
    if (action === "close") onClose(true);
    else if (action === "select") onPick(unified);
    else if (action === "first") focus?.focusFirst();
    else if (action === "last") focus?.focusLast();
    else if (step) step > 0 ? focus?.focusNext({ wrap: true }) : focus?.focusPrevious({ wrap: true });
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
