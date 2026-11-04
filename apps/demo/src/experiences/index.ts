import type { EmojiTypeahead } from "@brianhung/emoji-picker";

/** A `:` menu for any editor's typeahead; `className` says where it docks (each app's default is measured against its composer). */
export type EmojiMenuProps = EmojiTypeahead & { className?: string };
