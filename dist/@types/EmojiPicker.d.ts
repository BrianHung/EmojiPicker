import React from "react";
import { EmojiObject } from './utils';
import "./EmojiPicker.css";
declare type EmojiPickerProps = {
    emojiData: Record<string, EmojiObject[]>;
    handleEmojiSelect: (emoji: EmojiObject) => void;
    showNavbar?: boolean;
    showFooter?: boolean;
    showScroll?: boolean;
    emojisPerRow?: number;
};
export interface EmojiPickerRef {
    search: (query: string) => void;
    emojis: Record<string, EmojiObject[]>;
    handleKeyDownScroll: (event: React.KeyboardEvent<HTMLElement>) => void;
}
export declare const EmojiPicker: React.ForwardRefExoticComponent<EmojiPickerProps & React.RefAttributes<EmojiPickerRef>>;
export default EmojiPicker;
//# sourceMappingURL=EmojiPicker.d.ts.map