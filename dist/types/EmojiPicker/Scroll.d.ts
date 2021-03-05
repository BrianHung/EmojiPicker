import React, { MutableRefObject, MouseEvent } from "react";
import { FixedSizeList as VirtualList } from 'react-window';
import { EmojiObject, itemRange } from '../utils';
declare type ScrollProps = {
    emojisPerRow: number;
    emojiSize: number;
    numberScrollRows: number;
    focusedEmoji: {
        emoji: EmojiObject;
        row: number;
        focusOnRender: boolean;
        preventScroll: boolean;
    } | null;
    emojiData: Record<string, EmojiObject[]>;
    refVirtualList: MutableRefObject<VirtualList>;
    handleClickInScroll: (emoji: EmojiObject, row: number) => ((event: MouseEvent<HTMLLIElement>) => void) | undefined;
    handleMouseInScroll: (emoji: EmojiObject, row: number) => ((event: MouseEvent<HTMLLIElement>) => void) | undefined;
    itemCount: number;
    itemRanges: itemRange[];
    collapseHeightOnSearch: boolean;
};
declare const MemoizedScroll: React.NamedExoticComponent<ScrollProps>;
export default MemoizedScroll;
//# sourceMappingURL=Scroll.d.ts.map