export type KeyboardAction = "move-up" | "move-down" | "move-left" | "move-right" | "page-up" | "page-down" | "first" | "last" | "select" | "close" | "focus-search" | "toggle-skin-tone";

export type Keymap = Readonly<Record<KeyboardAction, readonly string[]>>;

export const DEFAULT_KEYMAP: Keymap = Object.freeze({
  "move-up": ["ArrowUp"],
  "move-down": ["ArrowDown"],
  "move-left": ["ArrowLeft"],
  "move-right": ["ArrowRight"],
  "page-up": ["PageUp"],
  "page-down": ["PageDown"],
  first: ["Home", "Ctrl+Home"],
  last: ["End", "Ctrl+End"],
  select: ["Enter", " "],
  close: ["Escape"],
  "focus-search": ["/"],
  "toggle-skin-tone": [],
});

export function resolveKeymap(overrides?: Partial<Record<KeyboardAction, readonly string[]>>): Keymap {
  return overrides ? { ...DEFAULT_KEYMAP, ...overrides } : DEFAULT_KEYMAP;
}

type KeyChordEvent = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
};

type Chord = { key: string; ctrl: boolean; meta: boolean; alt: boolean; shift: boolean | null };

const MODIFIERS = new Set(["ctrl", "control", "meta", "cmd", "command", "alt", "option", "shift", "mod"]);

function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? "";
  return /mac|iphone|ipad|ipod/i.test(platform);
}

export function parseChord(chord: string, apple = isApplePlatform()): Chord {
  const parts = chord.split("+");
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

const isPrintableSymbol = (key: string) => key !== " " && [...key].length === 1 && key.toLowerCase() === key.toUpperCase();

export function matchesChord(event: KeyChordEvent, chord: string | Chord, apple = isApplePlatform()): boolean {
  const c = typeof chord === "string" ? parseChord(chord, apple) : chord;
  const key = [...event.key].length === 1 ? event.key.toLowerCase() : event.key;
  const want = [...c.key].length === 1 ? c.key.toLowerCase() : c.key;
  if (key !== want) return false;
  if (Boolean(event.ctrlKey) !== c.ctrl || Boolean(event.metaKey) !== c.meta || Boolean(event.altKey) !== c.alt) return false;
  return c.shift === null || Boolean(event.shiftKey) === c.shift;
}

export function actionFor(event: KeyChordEvent, keymap: Keymap, apple = isApplePlatform()): KeyboardAction | null {
  for (const action of Object.keys(keymap) as KeyboardAction[]) {
    if (keymap[action].some((chord) => matchesChord(event, chord, apple))) return action;
  }
  return null;
}

// Alt counts as printable: it types characters on macOS
export function isTextEditingKey(event: KeyChordEvent): boolean {
  if (event.ctrlKey || event.metaKey) return false;
  return [...event.key].length === 1 || event.key === "Home" || event.key === "End";
}
