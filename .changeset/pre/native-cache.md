---
"@emoji-components/core": patch
---

The checks of which emoji the device font draws persist to `localStorage` per device, so a repeat visit skips the canvas work. Each visit still draws one sample per Unicode version, and a mismatch discards the stored checks.
