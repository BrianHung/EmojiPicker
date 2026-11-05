// Keyboard actions and the keys bound to them. Pure: no React, no DOM, so the
// resolution rules are unit-tested on their own.

/** What a key can do in a picker. Directions are physical: in a right-to-left picker, "move-left" goes to the next emoji. */
export type KeyboardAction =
  | "move-up"
  | "move-down"
  | "move-left"
  | "move-right"
  | "page-up"
  | "page-down"
  | "first"
  | "last"
  | "select"
  | "close"
  | "focus-search"
  | "toggle-skin-tone";

/**
 * Keys per action: `KeyboardEvent.key` values, optionally with modifiers joined by
 * "+": "Enter", "Ctrl+Home", "Mod+Enter" (Mod is ⌘ on Apple platforms, Ctrl elsewhere),
 * "Shift+?" or "Alt+ArrowDown". Letters match either case.
 */
export type Keymap = Readonly<Record<KeyboardAction, readonly string[]>>;

/** The default bindings. Pass a partial map to Root's `keymap` to replace an action's keys. */
export const DEFAULT_KEYMAP: Keymap = Object.freeze({
  "move-up": ["ArrowUp"],
  "move-down": ["ArrowDown"],
  "move-left": ["ArrowLeft"],
  "move-right": ["ArrowRight"],
  "page-up": ["PageUp"],
  "page-down": ["PageDown"],
  first: ["Home", "Ctrl+Home"],
  last: ["End", "Ctrl+End"],
  // Space as a button's own key; Shift+Space opens an emoji's skin-tone variations.
  select: ["Enter", " "],
  close: ["Escape"],
  "focus-search": ["/"],
  "toggle-skin-tone": [],
});

/** The defaults with `overrides` replacing whole actions (an empty array unbinds one). */
export function resolveKeymap(overrides?: Partial<Record<KeyboardAction, readonly string[]>>): Keymap {
  return overrides ? { ...DEFAULT_KEYMAP, ...overrides } : DEFAULT_KEYMAP;
}

/** The fields of a keyboard event the matcher reads (React, DOM, or a plain object in tests). */
type KeyChordEvent = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
};

type Chord = { key: string; ctrl: boolean; meta: boolean; alt: boolean; shift: boolean | null };

const MODIFIERS = new Set(["ctrl", "control", "meta", "cmd", "command", "alt", "option", "shift", "mod"]);

/** True on macOS and iOS, where "Mod" means ⌘. */
function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? "";
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/**
 * Parses "Mod+Shift+K". The last "+"-separated part is the key, so "+" itself is
 * written "Shift++" or "+". Shift is optional for a printable non-letter key
 * unless written, because layouts need it to type "?" or "+".
 */
export function parseChord(chord: string, apple = isApplePlatform()): Chord {
  const parts = chord.split("+");
  // "Ctrl++" splits into [..., "", ""]: the key is "+".
  let key = parts.pop()!;
  if (key === "" && parts.length && parts[parts.length - 1] === "") {
    parts.pop();
    key = "+";
  }
  const out: Chord = { key, ctrl: false, meta: false, alt: false, shift: false };
  let shiftWritten = false;
  for (const raw of parts) {
    const m = raw.trim().toLowerCase();
    if (!MODIFIERS.has(m)) throw new Error(`emoji-picker keymap: unknown modifier "${raw}" in "${chord}"`);
    if (m === "mod") {
      if (apple) out.meta = true;
      else out.ctrl = true;
    } else if (m === "ctrl" || m === "control") out.ctrl = true;
    else if (m === "meta" || m === "cmd" || m === "command") out.meta = true;
    else if (m === "alt" || m === "option") out.alt = true;
    else {
      out.shift = true;
      shiftWritten = true;
    }
  }
  if (!shiftWritten && isPrintableSymbol(key)) out.shift = null;
  return out;
}

// Space takes no Shift on any layout, so Shift+Space stays a separate key.
const isPrintableSymbol = (key: string) => key !== " " && [...key].length === 1 && key.toLowerCase() === key.toUpperCase();

/** Whether an event is this chord. */
export function matchesChord(event: KeyChordEvent, chord: string | Chord, apple = isApplePlatform()): boolean {
  const c = typeof chord === "string" ? parseChord(chord, apple) : chord;
  const key = [...event.key].length === 1 ? event.key.toLowerCase() : event.key;
  const want = [...c.key].length === 1 ? c.key.toLowerCase() : c.key;
  if (key !== want) return false;
  if (Boolean(event.ctrlKey) !== c.ctrl || Boolean(event.metaKey) !== c.meta || Boolean(event.altKey) !== c.alt) return false;
  return c.shift === null || Boolean(event.shiftKey) === c.shift;
}

/** The first action (in keymap order) bound to this event, or null. */
export function actionFor(event: KeyChordEvent, keymap: Keymap, apple = isApplePlatform()): KeyboardAction | null {
  for (const action of Object.keys(keymap) as KeyboardAction[]) {
    if (keymap[action].some((chord) => matchesChord(event, chord, apple))) return action;
  }
  return null;
}

/**
 * Keys a text field keeps for editing: printable characters (Alt included, which
 * types characters on macOS) and Home/End without Ctrl or ⌘. In the search field
 * these never trigger an action (except Home/End while the field is empty), so
 * "first" with a query needs its Ctrl+Home binding.
 * Left/Right are decided by the caret instead (see the results keyboard).
 */
export function isTextEditingKey(event: KeyChordEvent): boolean {
  if (event.ctrlKey || event.metaKey) return false;
  return [...event.key].length === 1 || event.key === "Home" || event.key === "End";
}
