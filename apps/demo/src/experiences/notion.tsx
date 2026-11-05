import * as React from "react";
import { EmojiPicker, useActiveEmoji, useCategoryNavigation, useEmojiPickerActions, useEmojiStore, type EmojiPickerActions, type EmojiTypeaheadOptions, type ShortcodeSuggestion } from "@brianhung/emoji-picker-react";
import { EmojiSuggestions } from "@brianhung/emoji-picker-react/floating-ui";
import * as I from "@/styles/icons";
import { notion, NOTION_SECTIONS } from "@/styles/notion/picker";
import { CELL, OPTION, tokensOf } from "@/styles/style";
import type { EmojiMenuProps } from ".";

export const notionEmojiOptions: EmojiTypeaheadOptions = { matchBy: "search", limit: 200 };

const ICONS: I.IconSet = I.ICONS.notion;
const CATEGORIES = NOTION_SECTIONS.filter((c) => c.id !== "suggested");

export function NotionEmojiMenu({ open, query, anchor, suggestions: menu, dismiss, keyHandler, editor, className, container = false }: EmojiMenuProps & { editor: HTMLElement; container?: HTMLElement | false }) {
  const actions = React.useRef<EmojiPickerActions>(null);
  React.useLayoutEffect(() => {
    keyHandler.current = (event) => event.key === "Tab" && Boolean(actions.current?.pick()) && (event.preventDefault(), true);
    return () => void (keyHandler.current = null);
  });

  return (
    <EmojiSuggestions.Popover open={open} onOpenChange={(next) => !next && dismiss()} anchor={anchor} sideOffset={4} container={container} className={className}>
      <EmojiPicker.Root
        query={query}
        searchResults="grouped"
        searchLimit={notionEmojiOptions.limit}
        categories={CATEGORIES}
        columns={12}
        keyboardTarget={editor}
        actionsRef={actions}
        onSelect={(selection) =>
          menu.choose(
            menu.suggestions.findIndex((s) => s.record.unified === selection.baseUnified),
            { record: false },
          )
        }
        data-style={notion.id}
        style={tokensOf(notion)}
        className="flex h-[356px] w-[min(408px,calc(100vw-16px))] flex-col overflow-hidden rounded-[10px] bg-picker-background text-picker-foreground shadow-picker [--emoji-cell-size:32px] [--emoji-header-height:34px] [--emoji-list-padding:12px] [--emoji-size:24px] [--emoji-image-size:24px] [font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe_UI',Helvetica,'Apple_Color_Emoji',Arial,sans-serif]"
      >
        <EmojiPicker.Viewport className="relative min-h-0 flex-1 pt-[0.5px] [scrollbar-color:rgb(161_158_153/0.5)_transparent] [--emoji-list-padding-end:-3px]">
          <EmojiPicker.List aria-label="Emoji suggestions" className="outline-none">
            {() => (
              <EmojiPicker.List.Section>
                <EmojiPicker.List.SectionTitle className="flex items-start bg-picker-background px-2 pt-3 text-[12px] leading-3 font-medium text-picker-muted" />
                <EmojiPicker.List.Items>{() => <EmojiPicker.List.Cell className={`${CELL} ${OPTION} cursor-pointer rounded-[4px] data-[highlighted]:bg-picker-selected`} />}</EmojiPicker.List.Items>
              </EmojiPicker.List.Section>
            )}
          </EmojiPicker.List>
        </EmojiPicker.Viewport>
        <Sections suggestions={menu.suggestions} />
      </EmojiPicker.Root>
    </EmojiSuggestions.Popover>
  );
}

function Sections({ suggestions }: { suggestions: readonly ShortcodeSuggestion[] }) {
  const store = useEmojiStore();
  const actions = useEmojiPickerActions();
  const { jumpToCategory } = useCategoryNavigation();
  const active = useActiveEmoji()?.group;
  const jump = (section: string) => {
    const first = suggestions.find((s) => s.record.group === section)?.record;
    if (!first) return;
    jumpToCategory(section, { instant: true });
    actions.highlight(first.imageUrl ? first.unified : store.withSkinTone(first.unified));
  };
  return (
    <div className="flex h-[51px] shrink-0 items-center gap-[3.2px] overflow-x-auto border-t border-picker-border px-3 pt-2 pb-2.5 [scrollbar-width:none]">
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
            className="flex size-8 shrink-0 items-center justify-center rounded-[6px] text-picker-subtle hover:bg-picker-hover data-active:bg-picker-selected"
          >
            {Icon ? <Icon size={22} strokeWidth={1.5} /> : null}
          </button>
        );
      })}
      <span className="flex size-8 shrink-0 items-center justify-center text-picker-subtle">
        <I.PlusCircleFilled size={22} />
      </span>
    </div>
  );
}
