"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const react_1 = __importStar(require("react"));
const Emoji_1 = __importDefault(require("../Emoji"));
const Navbar = (_a) => {
    var { data, handleSelectInNavbar } = _a, props = __rest(_a, ["data", "handleSelectInNavbar"]);
    const [index, setIndex] = (0, react_1.useState)(0);
    const onNavbarKeyDown = (event) => {
        switch (event.key) {
            case 'Enter':
                return handleSelectInNavbar(Object.keys(data)[index]);
            case 'ArrowLeft':
                return index > 0 && setIndex(index => index - 1);
            case 'ArrowRight':
                return index < Object.keys(data).length - 1 && setIndex(index => index + 1);
            case 'Home':
                return index > 0 && setIndex(0);
            case 'End':
                return index < Object.keys(data).length - 1 && setIndex(Object.keys(data).length - 1);
        }
    };
    const onNavbarClick = (index, category) => (event) => {
        setIndex(index);
        handleSelectInNavbar(category);
    };
    return (react_1.default.createElement("div", Object.assign({ className: "emoji-picker-navbar" }, props, { role: "tablist", "aria-label": "emoji categories" }), Object.entries(data).map(([category, list], i) => {
        const props = Object.assign({ className: "emoji-picker-navbar-category", key: `navbar-${category}`, onClick: onNavbarClick(i, category), onKeyDown: onNavbarKeyDown, role: "tab", "aria-label": category, "aria-selected": false, tabIndex: -1 }, i == index && {
            "aria-selected": true,
            tabIndex: 0,
            ref: (button) => { var _a; return Boolean((_a = document.activeElement) === null || _a === void 0 ? void 0 : _a.closest(".emoji-picker-navbar")) && (button === null || button === void 0 ? void 0 : button.focus()); },
        });
        return (react_1.default.createElement("button", Object.assign({}, props), react_1.default.createElement(Emoji_1.default, { emoji: list[0] })));
    })));
};
const MemoizedNavbar = (0, react_1.memo)(Navbar);
exports.default = MemoizedNavbar;
//# sourceMappingURL=Navbar.js.map