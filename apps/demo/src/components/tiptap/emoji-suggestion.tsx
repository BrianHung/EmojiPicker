// A Tiptap extension for `:shortcode` emoji suggestions, built on @tiptap/suggestion.
//
// Tiptap finds the trigger and the query; the picker library does the rest:
// `useEmojiSuggestions` ranks and owns highlight, keys and ARIA, and
// `EmojiPopover` positions the menu at the caret through its `anchor` prop.
// The extension only bridges the two with a tiny external store, so the menu is
// a plain React component rendered next to <EditorContent> (inside EmojiProvider).
import * as React from "react";
import { Extension, type Editor, type Range } from "@tiptap/react";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import { Emoji, EmojiPopover, useEmojiStore, useEmojiSuggestions, type ShortcodeSuggestion } from "@brianhung/emoji-picker";
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

/** The menu: render it once, anywhere under <EmojiProvider>, with the editor that has `EmojiSuggestion`. */
export function EmojiSuggestionMenu({ editor, className }: { editor: Editor; className?: string }) {
  const bridge = bridgeFor(editor);
  const state = React.useSyncExternalStore(bridge.subscribe, bridge.get, bridge.get);
  const store = useEmojiStore();
  const insert = (s: ShortcodeSuggestion) => {
    if (!state) return;
    // The emoji in the user's skin tone; custom emoji insert their :shortcode: (render it however your schema does).
    const chain = editor.chain().focus().deleteRange(state.range);
    // Custom emoji become an inline image node when the editor has EmojiNode; standard emoji stay text.
    if (s.record.imageUrl && editor.schema.nodes.emoji) chain.insertEmoji({ unified: s.record.unified, shortcode: s.shortcode, text: null }).run();
    else chain.insertContent(`${menu.textFor(s)} `).run();
  };
  const menu = useEmojiSuggestions({ query: state?.query ?? "", limit: 8, onChoose: insert, onDismiss: () => bridge.set(null) });
  // Tiptap hands key events to the plugin first; route them to the menu while it's open.
  bridge.keyHandler = (event) => menu.onKeyDown(event);
  React.useEffect(() => () => void (bridge.keyHandler = null), [bridge]);

  const open = Boolean(state) && menu.open;
  return (
    <EmojiPopover.Root open={open} onOpenChange={(next) => !next && bridge.set(null)} closeOnSelect={false}>
      <EmojiPopover.Content anchor={() => state?.rect() ?? null} sideOffset={6} onMouseDown={(e) => e.preventDefault()}>
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
      </EmojiPopover.Content>
    </EmojiPopover.Root>
  );
}
