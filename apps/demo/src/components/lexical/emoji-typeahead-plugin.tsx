// A Lexical plugin for `:shortcode` emoji suggestions, on Lexical's own typeahead menu.
//
// Lexical owns the trigger, the caret anchor and the keyboard (it highlights and
// selects options itself); `useEmojiSuggestions` supplies the ranked options and the
// text to insert. Compare the Tiptap example, where the library owns the keys too.
import * as React from "react";
import { createPortal } from "react-dom";
import { $createTextNode, type TextNode } from "lexical";
import { $createEmojiNode } from "./emoji-node";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalTypeaheadMenuPlugin, MenuOption, useBasicTypeaheadTriggerMatch } from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { Emoji, useEmojiStore, useEmojiSuggestions, type ShortcodeSuggestion } from "@brianhung/emoji-picker";
import { cn } from "@/lib/utils";

class EmojiOption extends MenuOption {
  constructor(
    readonly suggestion: ShortcodeSuggestion,
    readonly index: number,
  ) {
    super(suggestion.record.unified);
  }
}

// Characters that end a shortcode query. Lexical's default list includes _ + - which shortcodes use.
const PUNCTUATION = "\\.,\\*\\?\\$\\@\\|#{}\\(\\)\\^\\[\\]\\\\/!%'\"~=<>;:";

export function EmojiTypeaheadPlugin({ className }: { className?: string }) {
  const [editor] = useLexicalComposerContext();
  const store = useEmojiStore();
  const [query, setQuery] = React.useState<string | null>(null);
  const menu = useEmojiSuggestions({ query: query ?? "", limit: 8 });
  const options = React.useMemo(() => menu.suggestions.map((s, i) => new EmojiOption(s, i)), [menu.suggestions]);
  // `:` after whitespace or at the start (not in "10:30"), then 1+ shortcode characters.
  const trigger = useBasicTypeaheadTriggerMatch(":", { minLength: 1, punctuation: PUNCTUATION });

  const onSelectOption = React.useCallback(
    (option: EmojiOption, nodeToReplace: TextNode | null, closeMenu: () => void) => {
      editor.update(() => {
        // Custom emoji become an inline EmojiNode (their image); standard emoji stay text, in the user's skin tone.
        const { record, shortcode } = option.suggestion;
        const inserted = record.imageUrl ? $createEmojiNode({ unified: record.unified, shortcode, text: null }) : $createTextNode(`${menu.textFor(option.suggestion)} `);
        if (nodeToReplace) nodeToReplace.replace(inserted);
        inserted.selectNext();
        closeMenu();
      });
      menu.choose(option.index); // records it as recently used
    },
    [editor, menu],
  );

  return (
    <LexicalTypeaheadMenuPlugin<EmojiOption>
      onQueryChange={setQuery}
      onSelectOption={onSelectOption}
      options={options}
      triggerFn={trigger}
      menuRenderFn={(anchor, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) =>
        anchor.current && options.length
          ? createPortal(
              // Lexical's anchor element is the listbox; this list only lays out its options.
              <ul role="presentation" className={cn("mt-1.5 w-64 overflow-hidden rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg", className)}>
                {options.map((option, i) => {
                  const s = option.suggestion;
                  const [start, end] = s.match ?? [0, 0];
                  return (
                    <li
                      key={option.key}
                      // Lexical points aria-activedescendant at `typeahead-item-<index>`.
                      id={`typeahead-item-${i}`}
                      ref={option.setRefElement}
                      role="option"
                      aria-selected={selectedIndex === i}
                      data-highlighted={selectedIndex === i ? "" : undefined}
                      onMouseEnter={() => setHighlightedIndex(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectOptionAndCleanUp(option)}
                      className="flex h-8 cursor-default items-center gap-2 rounded-md px-2 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                    >
                      <Emoji unified={store.withSkinTone(s.record.unified)} size={18} className="shrink-0 leading-none" />
                      <span className="truncate font-mono text-[13px]">
                        :{s.shortcode.slice(0, start)}
                        <b className="font-semibold">{s.shortcode.slice(start, end)}</b>
                        {s.shortcode.slice(end)}:
                      </span>
                    </li>
                  );
                })}
              </ul>,
              anchor.current,
            )
          : null
      }
    />
  );
}
