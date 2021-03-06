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
import React, { memo } from "react";
import Emoji from "../Emoji";
const Footer = (_a) => {
    var { emoji, emojiPreviewName } = _a, props = __rest(_a, ["emoji", "emojiPreviewName"]);
    return (React.createElement("div", Object.assign({ className: "emoji-picker-footer" }, props),
        React.createElement(Emoji, { emoji: emoji || { name: "wave", unicode: "1f44b" } }),
        React.createElement("div", { className: "emoji-picker-name" }, emoji ? emojiPreviewName(emoji) : React.createElement("span", { style: { 'fontSize': '1.25em' } }, "Emoji Picker"))));
};
const MemoizedFooter = memo(Footer);
export default MemoizedFooter;
//# sourceMappingURL=Footer.js.map