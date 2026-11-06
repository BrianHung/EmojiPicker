---
"@brianhung/emoji-picker-core": patch
"@brianhung/emoji-picker-react": patch
---

The React entry points are client modules (`"use client"`), so Server Components can import them; `InteractionState` and `PopoverContentState` are exported. Core's `data/en.json` is typed as a `Dataset`. Frequently used emoji rank without reading the clock during render, so a Next.js Cache Components prerender succeeds, and `localStorageAdapter` reads only a browser's `localStorage`, not the one Node 25+ defines.
