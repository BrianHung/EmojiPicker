const KEY = "emoji-components:native";

type Saved = { ua: string; fonts: Record<string, Record<string, boolean>> };

function read(): Saved | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Saved | null;
    return saved?.ua === navigator.userAgent ? saved : null;
  } catch {
    return null;
  }
}

export function loadResults(font: string): Record<string, boolean> | undefined {
  return read()?.fonts[font];
}

export function saveResults(font: string, results: ReadonlyMap<string, boolean | null>): void {
  try {
    const saved = read() ?? { ua: navigator.userAgent, fonts: {} };
    saved.fonts[font] = {};
    for (const [unified, result] of results) if (result !== null) saved.fonts[font][unified] = result;
    window.localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {}
}
