import React from "react";
import { EmojiObject } from './utils';
import "./EmojiPicker.css";
declare type EmojiPickerProps = {
    emojiData: Record<string, EmojiObject[]>;
    emojiSize?: number;
    onEmojiSelect?: (emoji: EmojiObject) => void;
    showNavbar?: boolean;
    showFooter?: boolean;
    showScroll?: boolean;
    emojisPerRow?: number;
    numberScrollRows?: number;
    onKeyDownScroll?: Function;
    collapseCategoriesOnSearch?: boolean;
    collapseHeightOnSearch?: boolean;
    theme?: "system" | "light" | "dark";
};
export interface EmojiPickerRef {
    search: (query: string) => void;
    emojis: Record<string, EmojiObject[]>;
    focusedEmoji: EmojiObject | null;
    handleKeyDownScroll: (event: React.KeyboardEvent<HTMLElement>) => void;
}
export declare const EmojiPicker: React.ForwardRefExoticComponent<EmojiPickerProps & React.RefAttributes<EmojiPickerRef>>;
export {};
//# sourceMappingURL=EmojiPicker.d.ts.map