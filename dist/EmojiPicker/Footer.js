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
import React from "react";
import Emoji from "../Emoji";
const Footer = (_a) => {
    var { emoji } = _a, props = __rest(_a, ["emoji"]);
    return (React.createElement("div", Object.assign({ className: "emoji-picker-footer" }, props),
        React.createElement(Emoji, { emoji: emoji !== null ? emoji : { name: "wave", unicode: "1f44b" } }),
        React.createElement("div", { className: "emoji-picker-name" }, emoji !== null ? emoji.name : React.createElement("span", { style: { 'fontSize': '1.2em', 'fontWeight': 500 } }, "Emoji Mart"))));
};
const MemoizedFooter = React.memo(Footer);
export default MemoizedFooter;
