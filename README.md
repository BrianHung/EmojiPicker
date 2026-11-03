# EmojiPicker

A headless React emoji picker with Slack shortcodes, tapbacks, skin tones, custom emoji, replaceable search and platform-aware rendering. Docs: [packages/emoji-picker](packages/emoji-picker/README.md).

## Layout

| Path | |
|---|---|
| `packages/emoji-picker` | The library, published as `@brianhung/emoji-picker`: source, emoji data (`data/`), the data build (`scripts/`), tests |
| `apps/demo` | The demo site, the shadcn registry item (`registry/`) and the capture tools used to check pixel parity against real apps (`capture/`) |

## Commands

```bash
npm install          # all workspaces
npm run dev          # demo at http://localhost:5199, using the library's TypeScript source directly
npm test             # library tests
npm run typecheck    # every workspace
npm run build        # library (dist/) then the site and registry (apps/demo/dist/)
```

The demo imports `@brianhung/emoji-picker` by name. Its `@brianhung/source` export condition (scoped so other packages' `source` conditions are ignored) points workspace consumers at `src/`, so edits to the library hot-reload in the demo without a build.
