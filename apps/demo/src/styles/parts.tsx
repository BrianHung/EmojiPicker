import * as React from "react";
import { EmojiPicker, type CategoryOption } from "emoji-components";
import { cn } from "@/lib/utils";
import type * as I from "./icons";

const DEFAULT_ORDER: CategoryOption["id"][] = ["suggested", "custom", "smileys-people", "animals-nature", "food-drink", "travel-places", "activities", "objects", "symbols", "flags"];

export const noEmoji = ({ status }: EmojiPicker.List.EmptyState) => (status === "empty" ? <div className="py-10 text-center text-sm opacity-60">No emoji found</div> : null);

export function withIcons(
  icons: I.IconSet,
  { categories = DEFAULT_ORDER.map((id) => ({ id })), size = 20, strokeWidth = 1.75, hide = [] }: { categories?: CategoryOption[]; size?: number; strokeWidth?: number; hide?: string[] } = {},
): CategoryOption[] {
  return categories.map((c) => {
    const Icon = icons[c.id];
    return { ...c, icon: Icon ? <Icon size={size} strokeWidth={strokeWidth} /> : c.icon, ...(hide.includes(c.id) ? { nav: false } : {}) };
  });
}

export function HandTone({ emoji, className }: { emoji?: string; className: string }) {
  return (
    <EmojiPicker.SkinTone className="relative inline-flex">
      <EmojiPicker.SkinToneTrigger className={className}>
        <EmojiPicker.SkinToneGlyph emoji={emoji} />
      </EmojiPicker.SkinToneTrigger>
      <EmojiPicker.SkinToneOptions className="end-0 top-0 z-3 flex">
        {(tone) => (
          <EmojiPicker.SkinToneOption tone={tone} className={className}>
            <EmojiPicker.SkinToneGlyph emoji={emoji} />
          </EmojiPicker.SkinToneOption>
        )}
      </EmojiPicker.SkinToneOptions>
    </EmojiPicker.SkinTone>
  );
}

export function SearchClear() {
  return <EmojiPicker.SearchClear className="absolute end-[var(--emoji-picker-list-padding,10px)] top-1/2 flex size-[30px] -translate-y-1/2 items-center justify-center" />;
}

export function Tabs({ items, active, className, tab, activeTab, inactiveTab, right }: { items: React.ReactNode[]; active: number; className: string; tab: string; activeTab: string; inactiveTab?: string; right?: React.ReactNode }) {
  return (
    <div className={className} role="tablist">
      {items.map((t, i) => (
        <span key={i} role="tab" aria-selected={i === active} aria-disabled={i !== active || undefined} className={cn(tab, i === active ? activeTab : inactiveTab)}>
          {t}
        </span>
      ))}
      {right}
    </div>
  );
}

export function useActiveTabInView(vertical = false) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    const reveal = () => {
      const tab = bar.querySelector<HTMLElement>("[data-active]");
      if (!tab) return;
      const b = bar.getBoundingClientRect();
      const t = tab.getBoundingClientRect();
      if (vertical) {
        const k = bar.offsetHeight / b.height || 1;
        if (t.top < b.top) bar.scrollTop -= (b.top - t.top) * k;
        else if (t.bottom > b.bottom) bar.scrollTop += (t.bottom - b.bottom) * k;
      } else {
        const k = bar.offsetWidth / b.width || 1;
        if (t.left < b.left) bar.scrollLeft -= (b.left - t.left) * k;
        else if (t.right > b.right) bar.scrollLeft += (t.right - b.right) * k;
      }
    };
    reveal();
    const observer = new MutationObserver(reveal);
    observer.observe(bar, { subtree: true, attributes: true, attributeFilter: ["data-active"] });
    return () => observer.disconnect();
  }, [vertical]);
  return ref;
}
