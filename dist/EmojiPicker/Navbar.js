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
const Navbar = (_a) => {
    var { data, handleClickInNavbar } = _a, props = __rest(_a, ["data", "handleClickInNavbar"]);
    return (React.createElement("div", Object.assign({ className: "emoji-picker-navbar" }, props), Object.entries(data).map(([category, list]) => React.createElement("span", { className: "emoji-picker-navbar-category", key: `navbar-${category}`, "data-category": category, onClick: handleClickInNavbar(category) }, React.createElement(Emoji, { emoji: list[0] })))));
};
const MemoizedNavbar = React.memo(Navbar);
export default MemoizedNavbar;
