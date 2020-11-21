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
const Navbar = (_a) => {
    var { data, handleClickInNavbar } = _a, props = __rest(_a, ["data", "handleClickInNavbar"]);
    return (react_1.default.createElement("div", Object.assign({ className: "emoji-picker-navbar" }, props), Object.entries(data).map(([category, list]) => react_1.default.createElement("span", { className: "emoji-picker-navbar-category", key: `navbar-${category}`, "data-category": category, onClick: handleClickInNavbar(category) }, react_1.default.createElement(Emoji_1.default, { emoji: list[0] })))));
};
const MemoizedNavbar = react_1.default.memo(Navbar);
exports.default = MemoizedNavbar;
//# sourceMappingURL=Navbar.js.map