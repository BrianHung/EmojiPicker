// Grok Bot's `:` emoji menu, measured from the desktop app over CDP (Nov 2026):
// 294×184 dark popup, a "Results" label, then 8 columns of 32 px cells on a 34 px
// pitch from (13, 41); the first result is highlighted.
import * as React from "react";
import { Emoji, useEmojiStore, type EmojiSearch, type ShortcodeAutocomplete } from "@brianhung/emoji-picker";
import { cn } from "../components/code";

export const GROK_COLUMNS = 8;

/**
 * Grok's ranking, as a provider `search`: emoji with a name word or a whole shortcode
 * that starts with the query, in dataset order (":smi" → 😃 smiley, 😄 smile, … 🤭 via
 * smiling_face_…_covering_mouth); then tags containing it anywhere (🫳 "dismiss").
 */
export const grokSearch: EmojiSearch = (query, { records, limit }) => {
  const q = query.toLowerCase();
  const words = (text: string) => text.toLowerCase().split(/[\s_:-]+/);
  // A name word, or a whole shortcode, starting with the query (`sweat_smile` doesn't count for "smi").
  const first = (r: (typeof records)[number]) => words(r.name).some((w) => w.startsWith(q)) || r.shortcodes.some((c) => c.toLowerCase().startsWith(q));
  const byWord = records.filter(first);
  const byTag = records.filter((r) => !first(r) && r.tags.some((t) => t.toLowerCase().includes(q)));
  return [...byWord, ...byTag].slice(0, limit).map((r) => ({ unified: r.unified }));
};

/** Renders any autocomplete as Grok's grid. Use with `useShortcodeAutocomplete({ columns: GROK_COLUMNS, limit: 30 })`. */
export function GrokEmojiMenu({ autocomplete: ac, className }: { autocomplete: ShortcodeAutocomplete; className?: string }) {
  const store = useEmojiStore();
  if (!ac.open) return null;
  return (
    <div
      data-skin="grok"
      className={cn(
        "flex h-[184px] w-[294px] flex-col overflow-hidden rounded-[14px] border border-[rgb(245_245_245/0.06)] bg-[#1f1f1f] py-[6px] text-[#f5f5f5]",
        "font-[-apple-system,system-ui,sans-serif] font-[425]",
        className,
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-[12px] [scrollbar-width:none]">
        <div className="h-[34px] pt-[12px] text-[12px] leading-[15px] tracking-[0.01em] text-[rgb(245_245_245/0.66)]">Results</div>
        <div {...ac.getListProps()} className="grid grid-cols-[repeat(8,32px)] gap-[2px]">
          {ac.suggestions.map((s, i) => (
            <button
              key={`${s.record.unified}:${s.shortcode}`}
              type="button"
              {...ac.getOptionProps(i)}
              title={s.record.name}
              className="flex size-8 items-center justify-center rounded-[10px] data-[highlighted]:bg-[rgb(245_245_245/0.08)]"
            >
              <Emoji unified={store.withSkinTone(s.record.unified)} size={20} style={{ fontSize: 20, display: "inline-block", width: 20, height: 24, lineHeight: "24px" }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
