import React, { KeyboardEvent, MouseEvent } from "react";
import { EmojiObject } from './utils';
declare type EmojiPickerProps = {
    emojiData: Record<string, EmojiObject[]>;
    emojiSize?: number;
    onEmojiSelect?: (emoji: EmojiObject, event: KeyboardEvent | MouseEvent) => void;
    showNavbar?: boolean;
    showFooter?: boolean;
    showScroll?: boolean;
    emojisPerRow?: number;
    numberScrollRows?: number;
    onKeyDownScroll?: Function;
    collapseCategoriesOnSearch?: boolean;
    collapseHeightOnSearch?: boolean;
    theme?: "system" | "light" | "dark";
    emojiPreviewName?: (emoji: EmojiObject) => string;
};
export interface EmojiPickerRef {
    search: (query: string) => void;
    emojis: Record<string, EmojiObject[]>;
    focusedEmoji: EmojiObject | null;
    handleKeyDownScroll: (event: KeyboardEvent<HTMLElement>) => void;
}
export declare const EmojiPicker: React.ForwardRefExoticComponent<EmojiPickerProps & React.RefAttributes<EmojiPickerRef>>;
export {};
//# sourceMappingURL=EmojiPicker.d.ts.map