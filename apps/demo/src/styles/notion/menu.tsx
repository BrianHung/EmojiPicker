import * as React from "react";
import { autoUpdate, flip, FloatingPortal, offset, shift, useDismiss, useFloating, useInteractions } from "@floating-ui/react";
import { EmojiPicker, useEmojiPickerHighlight, useEmojiPickerCategories, useEmojiStore, type UseEmojiSuggestionsReturnValue, type UseEmojiSuggestionsOptions, type ShortcodeCompletion } from "emoji-components";
import * as I from "@/styles/icons";
import { notion, NOTION_SECTIONS } from "./picker";
import { CELL, OPTION, tokensOf } from "@/styles/style";

export const notionEmojiOptions: UseEmojiSuggestionsOptions = { matchBy: "search", limit: 200 };

const ICONS: I.IconSet = I.ICONS.notion;
const CATEGORIES = NOTION_SECTIONS.filter((c) => c.id !== "frequent");

export function NotionEmojiMenu({ editor, className, container, ...menu }: UseEmojiSuggestionsReturnValue & { className?: string } & { editor: HTMLElement; container?: React.RefObject<HTMLElement | null> }) {
  const { open, query, anchor, dismiss } = menu;
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: (next) => next || dismiss(),
    placement: "bottom-start",
    strategy: "fixed",
    transform: false,
    whileElementsMounted: (reference, floating, update) => autoUpdate(reference, floating, update, { layoutShift: false }),
    middleware: [offset(4), flip({ padding: 8, fallbackStrategy: "initialPlacement", crossAxis: false }), shift({ padding: 8, crossAxis: true })],
  });
  React.useLayoutEffect(() => refs.setPositionReference(anchor), [refs, anchor]);
  const { getFloatingProps } = useInteractions([useDismiss(context, { escapeKey: false })]);
  if (!open) return null;
  return (
    <FloatingPortal root={container}>
      <div ref={refs.setFloating} data-slot="emoji-suggestions" style={{ ...floatingStyles, zIndex: 50 }} {...getFloatingProps({ onMouseDown: (e) => e.preventDefault() })}>
        <div className={className}>
          <EmojiPicker.Root
            query={query}
            searchResults="grouped"
            searchLimit={notionEmojiOptions.limit}
            categories={CATEGORIES}
            columns={12}
            keyboardTarget={editor}
            onSelect={menu.insert}
            data-style={notion.id}
            style={tokensOf(notion)}
            className="flex h-[356px] w-[min(408px,calc(100vw-16px))] flex-col overflow-hidden rounded-[10px] bg-emoji-picker-background text-emoji-picker-foreground shadow-emoji-picker [--emoji-picker-cell-size:32px] [--emoji-picker-header-height:34px] [--emoji-picker-list-padding:12px] [--emoji-picker-emoji-size:24px] [--emoji-picker-emoji-image-size:24px] [font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe_UI',Helvetica,'Apple_Color_Emoji',Arial,sans-serif]"
          >
            <EmojiPicker.Viewport className="relative min-h-0 flex-1 pt-[0.5px] [scrollbar-color:rgb(161_158_153/0.5)_transparent] [--emoji-picker-list-padding-end:-3px]">
              <EmojiPicker.List aria-label="Emoji suggestions" className="outline-none">
                {() => (
                  <EmojiPicker.ListSection>
                    <EmojiPicker.ListSectionTitle className="flex items-start bg-emoji-picker-background px-2 pt-3 text-[12px] leading-3 font-medium text-emoji-picker-muted" />
                    <EmojiPicker.ListItems>{() => <EmojiPicker.ListCell className={`${CELL} ${OPTION} cursor-pointer rounded-[4px] data-[focused]:bg-emoji-picker-selected`} />}</EmojiPicker.ListItems>
                  </EmojiPicker.ListSection>
                )}
              </EmojiPicker.List>
            </EmojiPicker.Viewport>
            <Sections suggestions={menu.suggestions} />
          </EmojiPicker.Root>
        </div>
      </div>
    </FloatingPortal>
  );
}

function Sections({ suggestions }: { suggestions: readonly ShortcodeCompletion[] }) {
  const store = useEmojiStore();
  const { emoji, highlight } = useEmojiPickerHighlight();
  const { jumpToCategory } = useEmojiPickerCategories();
  const active = emoji?.group;
  const jump = (section: string) => {
    const first = suggestions.find((s) => s.record.group === section)?.record;
    if (!first) return;
    jumpToCategory(section, { instant: true });
    highlight(first.imageUrl ? first.unified : store.withSkinTone(first.unified));
  };
  return (
    <div className="flex h-[51px] shrink-0 items-center gap-[3.2px] overflow-x-auto border-t border-emoji-picker-border px-3 pt-2 pb-2.5 [scrollbar-width:none]">
      {NOTION_SECTIONS.map(({ id: section, name }) => {
        const Icon = ICONS[section];
        return (
          <button
            key={section}
            type="button"
            tabIndex={-1}
            aria-label={name}
            data-active={section === active || undefined}
            onClick={() => jump(section)}
            className="flex size-8 shrink-0 items-center justify-center rounded-[6px] text-emoji-picker-subtle hover:bg-emoji-picker-hover data-active:bg-emoji-picker-selected"
          >
            {Icon ? <Icon size={22} strokeWidth={1.5} /> : null}
          </button>
        );
      })}
      <span className="flex size-8 shrink-0 items-center justify-center text-emoji-picker-subtle">
        <I.PlusCircleFilled size={22} />
      </span>
    </div>
  );
}
