import * as React from "react";
import { Emoji, useEmojiSearch, useEmojiStore, useTextFieldEmojiTypeahead } from "@brianhung/emoji-picker-react";

function Composer() {
  const ref = React.useRef<HTMLInputElement>(null);
  const { open, suggestions: menu } = useTextFieldEmojiTypeahead(ref, { limit: 6 });
  return (
    <div className="relative w-full max-w-[352px]">
      {open ? (
        <ul {...menu.getListProps()} aria-label="Emoji suggestions" className="absolute inset-x-0 bottom-full mb-1.5 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-sm text-foreground shadow-lg">
          {menu.suggestions.map((s, i) => (
            <li key={`${s.record.unified}:${s.shortcode}`} {...menu.getOptionProps(i)} className="flex cursor-default items-center gap-2.5 rounded-md px-2 py-1.5 data-[highlighted]:bg-accent">
              <Emoji emoji={s.record.unified} size={20} className="text-xl leading-none" />
              <span className="font-medium">:{s.shortcode}:</span>
              <span className="ml-auto truncate pl-3 text-xs text-muted-foreground">{s.record.name}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <input
        ref={ref}
        aria-label="Message"
        placeholder="Type :tada or :thu"
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
      />
    </div>
  );
}

function CommandPalette() {
  const [query, setQuery] = React.useState("party");
  const { results } = useEmojiSearch(query, { limit: 24 });
  const [copied, setCopied] = React.useState<string | null>(null);
  const store = useEmojiStore();
  return (
    <div className="w-full max-w-[352px] overflow-hidden rounded-xl border border-border bg-popover shadow-md">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search emoji"
        placeholder="Search by name, tag or :shortcode"
        className="h-11 w-full border-b border-border bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
      />
      <ul className="max-h-56 overflow-y-auto p-1">
        {results.map((r) => (
          <li key={r.unified}>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => {
                const s = store.select(r.unified);
                if (s?.emoji) navigator.clipboard?.writeText(s.emoji);
                setCopied(r.name);
              }}
            >
              <Emoji emoji={r.unified} size={20} className="text-xl" />
              <span className="flex-1 truncate">{r.name}</span>
              {r.shortcodes[0] ? <code className="font-mono text-xs text-muted-foreground">:{r.shortcodes[0]}:</code> : null}
            </button>
          </li>
        ))}
        {!results.length ? <li className="px-3 py-6 text-center text-sm text-muted-foreground">No results</li> : null}
      </ul>
      <div className="h-8 border-t border-border px-3 text-xs leading-8 text-muted-foreground">{copied ? `Copied ${copied}` : `${results.length} results`}</div>
    </div>
  );
}

export function ShortcodeTypeahead() {
  return (
    <>
      <Composer />
      <CommandPalette />
    </>
  );
}
