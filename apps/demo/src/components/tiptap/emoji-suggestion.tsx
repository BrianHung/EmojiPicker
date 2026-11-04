// A Tiptap extension for `:shortcode` emoji suggestions, built on @tiptap/suggestion.
//
// Tiptap finds the trigger and the query; the picker library does the rest:
// `useEmojiSuggestions` ranks and owns highlight, keys and ARIA, and
// `EmojiSuggestions.Popover` positions the menu at the caret without taking focus.
// The extension only bridges the two with a tiny external store, so the menu is
// a plain React component rendered next to <EditorContent> (inside EmojiProvider).
// `useEmojiSuggestionQuery` is that bridge, for a menu of your own (Notion's grid).
import * as React from "react";
import { Extension, type Editor, type Range } from "@tiptap/react";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import { Emoji, EmojiSuggestions, useEmojiStore, useEmojiSuggestions, type ShortcodeSuggestion } from "@brianhung/emoji-picker";
import { cn } from "@/lib/utils";

type MenuState = { query: string; range: Range; rect: () => DOMRect | null } | null;

/** The bridge between the ProseMirror plugin and React: state plus a key handler the menu registers. */
function createBridge() {
  let state: MenuState = null;
  const listeners = new Set<() => void>();
  return {
    keyHandler: null as ((event: KeyboardEvent) => boolean) | null,
    get: () => state,
    set(next: MenuState) {
      state = next;
      listeners.forEach((l) => l());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
type Bridge = ReturnType<typeof createBridge>;

// One bridge per editor (Tiptap copies extension options, so they can't hold it).
const bridges = new WeakMap<Editor, Bridge>();
const bridgeFor = (editor: Editor) => {
  let bridge = bridges.get(editor);
  if (!bridge) bridges.set(editor, (bridge = createBridge()));
  return bridge;
};

export type EmojiSuggestionOptions = { char: string };

export const EmojiSuggestion = Extension.create<EmojiSuggestionOptions>({
  name: "emojiSuggestion",
  addOptions: () => ({ char: ":" }),
  addProseMirrorPlugins() {
    const { char } = this.options;
    const bridge = bridgeFor(this.editor);
    const sync = (props: SuggestionProps) =>
      bridge.set(props.query ? { query: props.query, range: props.range, rect: () => props.clientRect?.() ?? null } : null);
    return [
      Suggestion({
        pluginKey: new PluginKey("emojiSuggestion"),
        editor: this.editor,
        char,
        // `:` after a space or at the start of a line (not in "10:30"); stops at a space.
        allowedPrefixes: [" ", "(", " "],
        items: () => [],
        render: () => ({
          onStart: sync,
          onUpdate: sync,
          onExit: () => bridge.set(null),
          onKeyDown: ({ event }: SuggestionKeyDownProps) => bridge.keyHandler?.(event) ?? false,
        }),
      }),
    ];
  },
});

/** The open `:` query and how to complete it: what a menu is built on. */
export type EmojiSuggestionQuery = {
  /** What follows the `:`; "" while closed. */
  query: string;
  open: boolean;
  /** The typed `:query` on screen, for anchoring a popover. */
  rect: () => DOMRect | null;
  /** Replace the typed `:query` with the suggestion (`text` is what `useEmojiSuggestions().textFor` gives). */
  insert: (suggestion: ShortcodeSuggestion, text: string) => void;
  close: () => void;
};

/**
 * The editor's `:` query, for a menu of your own (a grid, sections). Keys typed in the
 * editor go to `keys.current` first while the query is open; return true when handled.
 */
export function useEmojiSuggestionQuery(editor: Editor, keys: React.RefObject<((event: KeyboardEvent) => boolean) | null>): EmojiSuggestionQuery {
  const bridge = bridgeFor(editor);
  const state = React.useSyncExternalStore(bridge.subscribe, bridge.get, bridge.get);
  // Tiptap hands key events to the plugin first; route them to the menu while it's open.
  React.useEffect(() => {
    bridge.keyHandler = (event) => keys.current?.(event) ?? false;
    return () => void (bridge.keyHandler = null);
  }, [bridge, keys]);
  return {
    query: state?.query ?? "",
    open: Boolean(state),
    rect: () => state?.rect() ?? null,
    insert(s, text) {
      if (!state) return;
      const chain = editor.chain().focus().deleteRange(state.range);
      // Custom emoji become an inline image node when the editor has EmojiNode; standard emoji stay text.
      if (s.record.imageUrl && editor.schema.nodes.emoji) chain.insertEmoji({ unified: s.record.unified, shortcode: s.shortcode, text: null }).run();
      else chain.insertContent(`${text} `).run();
    },
    close: () => bridge.set(null),
  };
}

export type EmojiSuggestionMenuProps = {
  editor: Editor;
  /** Classes for the list (its look); rows are `li`, the highlighted one `[data-highlighted]`. */
  className?: string;
  /** Most suggestions shown. Default 8. */
  limit?: number;
  /** Side of the caret it opens on (flips when there's no room). Default "bottom". */
  side?: "top" | "bottom";
};

/** The menu: render it once, anywhere under <EmojiProvider>, with the editor that has `EmojiSuggestion`. */
export function EmojiSuggestionMenu({ editor, className, limit = 8, side = "bottom" }: EmojiSuggestionMenuProps) {
  const keys = React.useRef<(event: KeyboardEvent) => boolean>(null);
  const suggestion = useEmojiSuggestionQuery(editor, keys);
  const store = useEmojiStore();
  const menu = useEmojiSuggestions({ query: suggestion.query, limit, onChoose: (s) => suggestion.insert(s, menu.textFor(s)), onDismiss: suggestion.close });
  keys.current = (event) => menu.onKeyDown(event);

  return (
    <EmojiSuggestions.Popover open={suggestion.open && menu.open} onOpenChange={(next) => !next && suggestion.close()} anchor={suggestion.rect} side={side} sideOffset={6}>
        <ul
          {...menu.getListProps()}
          className={cn("w-64 overflow-hidden rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg", className)}
        >
          {menu.suggestions.map((s, i) => {
            const [start, end] = s.match ?? [0, 0];
            return (
              <li key={s.record.unified} {...menu.getOptionProps(i)} className="flex h-8 cursor-default items-center gap-2 rounded-md px-2 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground">
                <Emoji emoji={store.withSkinTone(s.record.unified)} size={18} className="shrink-0 leading-none" />
                <span className="truncate font-mono text-[13px]">
                  :{s.shortcode.slice(0, start)}
                  <b className="font-semibold">{s.shortcode.slice(start, end)}</b>
                  {s.shortcode.slice(end)}:
                </span>
              </li>
            );
          })}
        </ul>
    </EmojiSuggestions.Popover>
  );
}
