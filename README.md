# EmojiPicker

Unstyled React components for emoji pickers, tapbacks, and shortcode autocomplete. See the [library documentation](packages/emoji-picker/README.md).

## Repository layout

| Path | Contents |
|---|---|
| `packages/emoji-picker` | The library, published as `@brianhung/emoji-picker`, with its data build and tests |
| `apps/demo` | The documentation site, the shadcn/ui registry item, and the site's Cloudflare Worker. See its [README](apps/demo/README.md). |
| `docs` | Research notes, including the [keyboard and accessibility audit](docs/keyboard-accessibility-audit.md) |

## Commands

Run these from the repository root.

```bash
npm install
npm run dev          # the demo at http://localhost:5199
npm test             # library unit tests
npm run typecheck    # every workspace
npm run lint         # Biome lint; `npm run format` formats
npm run build        # the library, then the site and registry
```

In the workspace, the demo resolves `@brianhung/emoji-picker` to the library's TypeScript source through the `@brianhung/source` export condition, so library edits reload without a build.

## Design notes

Search runs on an in-memory index, built once and lazily. Measured in headless Chrome (M-series Mac, iamcal dataset, 7 runs, 1x / 4x CPU throttle), it answered a query in under 0.05 ms against 0.2 / 0.9 ms for IndexedDB, with a p95 of 0.2 / 1.2 ms against 3.9 / 11.9 ms. IndexedDB only wins on warm startup (1.9 ms) and about 0.8 MB of JS heap.

The dataset ships as a separate hashed `.json` asset. Inlining it into JS as a `JSON.parse("…")` string costs 2.5x the heap (2.1 MB against 844 KB), because V8 keeps the script source.

## License

MIT. Third-party notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
