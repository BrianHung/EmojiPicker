import React from 'react';
import { EmojiObject } from './utils';
import "./Emoji.css";
declare type EmojiProps = {
    emoji: EmojiObject;
    [key: string]: any;
};
declare const Emoji: React.ForwardRefExoticComponent<Pick<EmojiProps, string | number> & React.RefAttributes<HTMLSpanElement>>;
export default Emoji;
export { EmojiProps };
//# sourceMappingURL=Emoji.d.ts.map