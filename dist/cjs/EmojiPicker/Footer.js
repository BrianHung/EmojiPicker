"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const Emoji_1 = __importDefault(require("../Emoji"));
const Footer = (_a) => {
    var { emoji } = _a, props = __rest(_a, ["emoji"]);
    return (react_1.default.createElement("div", Object.assign({ className: "emoji-picker-footer" }, props),
        react_1.default.createElement(Emoji_1.default, { emoji: emoji ? emoji : { name: "wave", unicode: "1f44b" } }),
        react_1.default.createElement("div", { className: "emoji-picker-name" }, emoji ? emoji.name : react_1.default.createElement("span", { style: { 'fontSize': '1.2em', 'fontWeight': 500 } }, "Emoji Mart"))));
};
const MemoizedFooter = react_1.default.memo(Footer);
exports.default = MemoizedFooter;
//# sourceMappingURL=Footer.js.map