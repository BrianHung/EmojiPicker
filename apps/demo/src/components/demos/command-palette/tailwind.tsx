import * as React from "react";
import { Emoji, useEmojiSearch, useEmojiStore } from "emoji-components";

export function CommandPalette() {
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
