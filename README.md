# EmojiPicker

shadcn for emoji pickers: headless, unstyled React parts for emoji pickers, tapbacks and shortcode autocomplete, built on React Aria, plus copy-in components from a shadcn registry. Docs and demos: [emoji.brianhung.me](https://emoji.brianhung.me). API reference: the [library README](packages/emoji-picker/README.md).

## Install

```bash
npm install @brianhung/emoji-picker
```

Or copy a styled shadcn/ui component into your project:

```bash
npx shadcn@latest add https://emoji.brianhung.me/r/emoji-picker.json
npx shadcn@latest add https://emoji.brianhung.me/r/emoji-picker-popover.json        # in your Base UI or Radix popover
npx shadcn@latest add https://emoji.brianhung.me/r/emoji-picker-popover-aria.json   # in a React Aria popover
```

## Repository layout

| Path | Contents |
|---|---|
| `packages/emoji-picker` | The library, published as `@brianhung/emoji-picker`, with its data build and unit tests |
| `apps/demo` | The site, the shadcn registry items, the e2e, axe and screen reader suites, and the site's Cloudflare Worker. See its [README](apps/demo/README.md). |
| `docs` | Research notes, including the [keyboard and accessibility audit](docs/keyboard-accessibility-audit.md) |
| `.changeset` | Pending release notes for the library |

## Commands

Run these from the repository root.

```bash
npm install
npm run dev          # the site at http://localhost:5199
npm test             # library unit tests
npm run test:e2e     # Playwright: behaviour, editors, grid, IME, perf and visual specs
npm run test:a11y    # axe on every page and picker surface
npm run typecheck    # every workspace
npm run check        # Biome lint and format check; `npm run format` formats
npm run build        # the library, then the site and registry
npm run size         # bundle-size budgets on the library build (.size-limit.json)
npm run changeset    # describe a change for the next release
```

In the workspace, the site resolves `@brianhung/emoji-picker` to the library's TypeScript source through the `@brianhung/source` export condition, so library edits reload without a build.

Visual baselines are local: capture them with `npm run test:baseline -w demo`. CI ([ci.yml](.github/workflows/ci.yml)) runs Biome, typecheck, unit tests, the build, the size budgets, the other e2e specs against a production build, and axe. [screen-readers.yml](.github/workflows/screen-readers.yml) runs VoiceOver and NVDA.

## Releasing

Changes that affect the published package come with a changeset (`npm run changeset`). The Release workflow, run by hand from the Actions tab, opens a "Version packages" PR that applies them (`npm run version-packages`: bumps the version, writes the CHANGELOG). It never publishes. Publishing is the owner's call and needs the owner's npm account or token:

```bash
npm run build -w @brianhung/emoji-picker
npx changeset publish
```

## Design notes

Search runs on an in-memory index, built once and lazily. Measured in headless Chrome (M-series Mac, iamcal dataset, 7 runs, 1x / 4x CPU throttle), it answered a query in under 0.05 ms against 0.2 / 0.9 ms for IndexedDB, with a p95 of 0.2 / 1.2 ms against 3.9 / 11.9 ms. IndexedDB only wins on warm startup (1.9 ms) and about 0.8 MB of JS heap.

The dataset ships as a separate hashed `.json` asset. Inlining it into JS as a `JSON.parse("…")` string costs 2.5x the heap (2.1 MB against 844 KB), because V8 keeps the script source.

## License

MIT. Third-party notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
