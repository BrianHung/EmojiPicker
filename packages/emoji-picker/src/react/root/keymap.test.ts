import { describe, expect, it } from "vitest";
import { DEFAULT_KEYMAP, actionFor, isTextEditingKey, matchesChord, parseChord, resolveKeymap } from "./keymap";

const key = (k: string, mods: { ctrl?: boolean; meta?: boolean; alt?: boolean; shift?: boolean } = {}) => ({
  key: k,
  ctrlKey: !!mods.ctrl,
  metaKey: !!mods.meta,
  altKey: !!mods.alt,
  shiftKey: !!mods.shift,
});

describe("keymap", () => {
  it("resolves the default bindings", () => {
    expect(actionFor(key("ArrowDown"), DEFAULT_KEYMAP)).toBe("move-down");
    expect(actionFor(key("PageUp"), DEFAULT_KEYMAP)).toBe("page-up");
    expect(actionFor(key("Home"), DEFAULT_KEYMAP)).toBe("first");
    expect(actionFor(key("End", { ctrl: true }), DEFAULT_KEYMAP)).toBe("last");
    expect(actionFor(key("Enter"), DEFAULT_KEYMAP)).toBe("select");
    expect(actionFor(key(" "), DEFAULT_KEYMAP)).toBe("select");
    expect(actionFor(key(" ", { shift: true }), DEFAULT_KEYMAP)).toBeNull();
    expect(actionFor(key("Escape"), DEFAULT_KEYMAP)).toBe("close");
    expect(actionFor(key("/"), DEFAULT_KEYMAP)).toBe("focus-search");
    expect(DEFAULT_KEYMAP["toggle-skin-tone"]).toEqual([]);
  });

  it("matches modifiers exactly", () => {
    expect(actionFor(key("ArrowDown", { shift: true }), DEFAULT_KEYMAP)).toBeNull();
    expect(actionFor(key("Enter", { meta: true }), DEFAULT_KEYMAP)).toBeNull();
    expect(actionFor(key("Home", { alt: true }), DEFAULT_KEYMAP)).toBeNull();
  });

  it("replaces whole actions; an empty list unbinds", () => {
    const keymap = resolveKeymap({ "move-down": ["j"], select: [] });
    expect(actionFor(key("j"), keymap)).toBe("move-down");
    expect(actionFor(key("J", { shift: true }), keymap)).toBeNull();
    expect(actionFor(key("ArrowDown"), keymap)).toBeNull();
    expect(actionFor(key("Enter"), keymap)).toBeNull();
    expect(keymap["move-up"]).toEqual(["ArrowUp"]);
    expect(resolveKeymap()).toBe(DEFAULT_KEYMAP);
  });

  it("reads Mod as ⌘ on Apple platforms and Ctrl elsewhere", () => {
    expect(matchesChord(key("Enter", { meta: true }), "Mod+Enter", true)).toBe(true);
    expect(matchesChord(key("Enter", { ctrl: true }), "Mod+Enter", true)).toBe(false);
    expect(matchesChord(key("Enter", { ctrl: true }), "Mod+Enter", false)).toBe(true);
    expect(matchesChord(key("k", { ctrl: true, shift: true }), "Ctrl+Shift+K", false)).toBe(true);
  });

  it("parses symbol keys, '+' and modifier aliases", () => {
    expect(parseChord("Ctrl++", false)).toMatchObject({ key: "+", ctrl: true, shift: null });
    expect(parseChord("+", false)).toMatchObject({ key: "+" });
    expect(parseChord("Cmd+Option+ArrowUp", false)).toMatchObject({ key: "ArrowUp", meta: true, alt: true, shift: false });
    expect(matchesChord(key("?", { shift: true }), "?")).toBe(true);
    expect(matchesChord(key("?", { shift: true }), "Shift+?")).toBe(true);
    expect(() => parseChord("Hyper+K")).toThrow(/unknown modifier/);
  });

  it("knows which keys a text field keeps", () => {
    expect(isTextEditingKey(key("j"))).toBe(true);
    expect(isTextEditingKey(key("Home"))).toBe(true);
    expect(isTextEditingKey(key("Home", { ctrl: true }))).toBe(false);
    expect(isTextEditingKey(key("PageDown"))).toBe(false);
    expect(isTextEditingKey(key("ArrowDown"))).toBe(false);
  });
});
