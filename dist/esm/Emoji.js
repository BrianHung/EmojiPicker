var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import React, { forwardRef } from 'react';
import { unifiedToNative } from './utils';
import twemoji from "./twemoji.svg";
import "./Emoji.css";
const Emoji = forwardRef(function EmojiComponent(_a, ref) {
    var { emoji, className } = _a, props = __rest(_a, ["emoji", "className"]);
    className = className ? `emoji-picker-emoji ${className}` : `emoji-picker-emoji`;
    return (React.createElement("span", Object.assign({ className: className, "data-unicode": emoji.unicode }, props, { ref: ref }),
        React.createElement("img", { className: "emoji-picker-emoji-img", "aria-label": emoji.name, alt: unifiedToNative(emoji.unicode), src: `${twemoji}#${emoji.unicode}`, draggable: "false" })));
});
export default Emoji;
//# sourceMappingURL=Emoji.js.map