import * as React from "react";
import { EmojiPicker, type CategoryOption } from "@brianhung/emoji-picker";
import { cn } from "@/lib/utils";
import type * as I from "./icons";

const DEFAULT_ORDER = ["suggested", "custom", "smileys_people", "animals_nature", "food_drink", "travel_places", "activities", "objects", "symbols", "flags"];

/** Sections with the app's tab icons; `hide` keeps sections in the list without a tab. */
export function withIcons(icons: I.IconSet, { categories = DEFAULT_ORDER.map((id) => ({ id })), size = 20, strokeWidth = 1.75, hide = [] }: { categories?: CategoryOption[]; size?: number; strokeWidth?: number; hide?: string[] } = {}): CategoryOption[] {
  return categories.map((c) => {
    const Icon = icons[c.id];
    return { ...c, icon: Icon ? <Icon size={size} strokeWidth={strokeWidth} /> : c.icon, ...(hide.includes(c.id) ? { nav: false } : {}) };
  });
}

/** Slack's and Discord's skin tone: an emoji (✋) in each tone. */
export function HandTone({ emoji, className }: { emoji?: string; className: string }) {
  return (
    <EmojiPicker.SkinTone className="relative inline-flex">
      <EmojiPicker.SkinTone.Trigger className={className}>
        <EmojiPicker.SkinTone.Glyph emoji={emoji} />
      </EmojiPicker.SkinTone.Trigger>
      <EmojiPicker.SkinTone.Options className="end-0 top-0 z-3 flex">
        {(tone) => (
          <EmojiPicker.SkinTone.Option tone={tone} className={className}>
            <EmojiPicker.SkinTone.Glyph emoji={emoji} />
          </EmojiPicker.SkinTone.Option>
        )}
      </EmojiPicker.SkinTone.Options>
    </EmojiPicker.SkinTone>
  );
}

/** Clears the query, at the field's end. */
export function SearchClear() {
  return <EmojiPicker.Search.Clear className="absolute end-[var(--emoji-list-padding,10px)] top-1/2 flex size-[30px] -translate-y-1/2 items-center justify-center" />;
}

/** Static tabs above a picker (Notion's Emoji / Icons / Upload, Discord's GIFs / Stickers / Emoji). */
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

/** Keeps the active tab of a scrolling category bar in view, scrolling only the bar (scrollIntoView would scroll the page too). */
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
      // Rects are in screen px; a scaled picker (FitBox) scrolls in its own px.
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
