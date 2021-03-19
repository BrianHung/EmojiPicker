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
exports.Emoji = void 0;
const react_1 = __importDefault(require("react"));
const utils_1 = require("./utils");
const twemoji_svg_1 = __importDefault(require("./twemoji.svg"));
const Emoji = (_a) => {
    var { emoji, className } = _a, props = __rest(_a, ["emoji", "className"]);
    className = className ? `emoji-picker-emoji ${className}` : `emoji-picker-emoji`;
    return (react_1.default.createElement("span", Object.assign({ className: className, "data-unicode": emoji.unicode }, props),
        react_1.default.createElement("img", { className: "emoji-picker-emoji-img", alt: utils_1.unifiedToNative(emoji.unicode), src: `${twemoji_svg_1.default}#${emoji.unicode}`, draggable: "false", "aria-label": emoji.name })));
};
exports.Emoji = Emoji;
exports.default = Emoji;
//# sourceMappingURL=Emoji.js.map