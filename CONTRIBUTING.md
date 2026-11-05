# Contributing

## Repository layout

| Path | Contents |
|---|---|
| `packages/emoji-picker-core` | [`@brianhung/emoji-picker-core`](packages/emoji-picker-core/README.md): data, search, stores and the ProseMirror plugin, with no dependencies |
| `packages/emoji-picker` | [`@brianhung/emoji-picker`](packages/emoji-picker/README.md): the React parts and hooks |
| `packages/emoji-picker-data` | [`@brianhung/emoji-picker-data`](packages/emoji-picker-data/README.md): datasets for every emojibase locale and shortcode set, built at pack time |
| `apps/demo` | The site, the shadcn registry items, the e2e, axe and screen reader suites, and the site's Cloudflare Worker ([README](apps/demo/README.md)) |
| `.changeset` | Pending release notes |

## Commands

Run these from the repository root.

```bash
npm install
npm run dev          # the site at http://localhost:5199
npm test             # core and React unit tests
npm run test:e2e     # Playwright: keyboard, editors, layout, IME, perf and visual specs
npm run test:a11y    # axe on every page and picker surface
npm run typecheck    # every workspace
npm run check        # Biome lint and format check; `npm run format` formats
npm run build        # core, the React package, then the site and registry
npm run size         # bundle-size budgets on the library build (.size-limit.json)
npm run changeset    # describe a change for the next release
```

In the workspace, the site resolves the packages to their TypeScript source through the `@brianhung/source` export condition, so library edits reload without a build.

Visual baselines are local: capture them with `npm run test:baseline -w demo`. CI ([ci.yml](.github/workflows/ci.yml)) runs Biome, typecheck, unit tests, the builds, the size budgets, the data package's validation, a packed-install smoke test, the other e2e specs against a production build, and axe. [screen-readers.yml](.github/workflows/screen-readers.yml) runs VoiceOver and NVDA.

## Releasing

Changes to a published package come with a changeset (`npm run changeset`). The Release workflow, run by hand, opens a "Version packages" PR that applies them (`npm run version-packages`). It never publishes; publishing needs the owner's npm account:

```bash
npm run build -w @brianhung/emoji-picker-core && npm run build -w @brianhung/emoji-picker
npx changeset publish
```
