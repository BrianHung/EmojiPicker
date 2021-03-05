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
import React, { useState, memo } from "react";
import Emoji from "../Emoji";
const Navbar = (_a) => {
    var { data, handleSelectInNavbar } = _a, props = __rest(_a, ["data", "handleSelectInNavbar"]);
    const [index, setIndex] = useState(0);
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
    return (React.createElement("div", Object.assign({ className: "emoji-picker-navbar" }, props, { role: "tablist", "aria-label": "emoji categories" }), Object.entries(data).map(([category, list], i) => {
        const props = Object.assign({ className: "emoji-picker-navbar-category", key: `navbar-${category}`, onClick: onNavbarClick(i, category), onKeyDown: onNavbarKeyDown, role: "tab", "aria-label": category, "aria-selected": false, tabIndex: -1 }, i == index && {
            "aria-selected": true,
            tabIndex: 0,
            ref: (button) => { var _a; return Boolean((_a = document.activeElement) === null || _a === void 0 ? void 0 : _a.closest(".emoji-picker-navbar")) && (button === null || button === void 0 ? void 0 : button.focus()); },
        });
        return (React.createElement("button", Object.assign({}, props), React.createElement(Emoji, { emoji: list[0] })));
    })));
};
const MemoizedNavbar = memo(Navbar);
export default MemoizedNavbar;
//# sourceMappingURL=Navbar.js.map