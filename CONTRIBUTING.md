# Contributing

## Repository layout

| Path | Contents |
|---|---|
| `packages/core` | [`@brianhung/emoji-picker-core`](packages/core/README.md): data, search, and stores, with no dependencies |
| `packages/react` | [`@brianhung/emoji-picker-react`](packages/react/README.md): the React parts and hooks |
| `packages/data` | [`@brianhung/emoji-picker-data`](packages/data/README.md): datasets for every Emojibase locale and shortcode set, built at pack time |
| `packages/twemoji-font` | [`@brianhung/emoji-picker-twemoji-font`](packages/twemoji-font/README.md): Twemoji as a COLRv0 web font, built with nanoemoji (Python 3.12) in CI, at pack time, or by `npm run build:font`. Without a local build, the site loads the published CSS from jsDelivr. |
| `apps/demo` | The site, the shadcn registry items, the e2e, axe, and screen reader suites, and the site's Cloudflare Worker ([README](apps/demo/README.md)) |
| `.changeset` | Pending release notes |

## Commands

Run these from the repository root.

```bash
npm install
npm run dev            # the site at http://localhost:5199
npm test               # core and React unit tests
npm run test:e2e       # Playwright: keyboard, editors, layout, IME, perf, and visual specs
npm run test:a11y      # axe on every page and picker surface
npm run typecheck      # every workspace
npm run check          # Biome lint and format check; `npm run format` formats
npm run build          # core, the React package, then the site and registry
npm run size           # bundle-size budgets on the library build (.size-limit.json)
npm run smoke          # packed tarballs in fresh Vite, Next.js, and shadcn apps
npm run release:check  # everything above, plus visual and axe on a production build
npm run changeset      # describe a change for the next release
```

In the workspace, the site resolves the packages to their TypeScript source through the `@brianhung/source` export condition, so library edits reload without a build.

The e2e, axe, and screen reader suites serve the site on port 5199 (5198 with `E2E_BUILD=1`); set `E2E_PORT` to use another, for example beside a running dev server or a second checkout. With `E2E_PORT` set, the suites start their own server and never reuse one.

Visual baselines are local. Capture them with `npm run test:baseline -w demo`.

### CI

- [ci.yml](.github/workflows/ci.yml) runs Biome, the typecheck, the unit tests, the builds, the size budgets, the data package's validation, the Twemoji font build and its Chromium, WebKit, and Firefox render test, the packed-install smoke test, the other e2e specs against a production build, and axe.
- [screen-readers.yml](.github/workflows/screen-readers.yml) runs VoiceOver and NVDA.
- [upstream.yml](.github/workflows/upstream.yml), run by hand, bumps the pinned emojibase-data and Twemoji versions, rebuilds, runs the tests, and opens a PR.

## API conventions

The API shape follows Base UI. Behavior follows React Aria.

| Rule | Source |
|---|---|
| Parts compose (`EmojiPicker.Root`, `List.Cell`); types are namespaced on the part (`EmojiPicker.Root.Props`, `.State`, `.Actions`) beside flat aliases | Base UI |
| Every part takes `render`, `className`, and `style`, each a value or a function of state | Base UI |
| State is `x` / `defaultX` / `onXChange(value, details)`; `details` is `{ reason, event, cancel(), isCanceled, allowPropagation(), isPropagationAllowed }` | Base UI |
| Reasons use Base UI's names: `trigger-press`, `outside-press`, `escape-key`, `item-press`, `focus-out`, `input-change`, `clear-press`, `imperative-action`, `none`; a highlight moves by `keyboard`, `pointer`, or `none`, as in `onItemHighlighted` | Base UI |
| A popover that closes because the page scrolls reports `scroll`; frequently used emoji report `pick`, `remove`, and `clear`. Base UI has no counterpart for these. | This package |
| Imperative calls go through `actionsRef`; `event.preventEmojiPickerHandler()`, on every handler a part composes with its own, skips the part's handler | Base UI |
| State attributes: `data-highlighted` (keyboard or pointer), `data-selected`, `data-pressed`, `data-disabled`, `data-open` / `data-closed`, `data-popup-open`, `data-starting-style` / `data-ending-style`, present as `""` or absent | Base UI |
| Emoji values are unified codes; a highlight's section-scoped key is `details.key` | Base UI (item values) |
| ARIA patterns, focus management, virtual focus (`aria-activedescendant`), and keyboard delegates | React Aria |
| Press, hover, and focus-ring state through `usePress`, `useHover`, and `useFocusRing` (`data-hovered`, `data-pressed`, `data-focus-visible`) on buttons, cells, and tabs | React Aria |
| Locale, RTL, and collation through `I18nProvider` and `useLocale` | React Aria |
| Collections take render-function children and `renderEmptyState`; layout and virtualization follow `Virtualizer` / `Layout` | React Aria |
| Headless hooks return prop getters (`getListProps`, `getOptionProps`) that merge the props you pass, as `useAutocomplete` returns `inputProps` and `collectionProps` | React Aria |
| Core holds the framework-neutral engine: the store, search, typeahead, and picker state (`createEmojiPicker`), with grid math on `/grid` and native support on `/native`. Snapshots are read-only and actions are methods, as in the AI SDK's `AbstractChat`; private state stays in closures. React binds through core's public API and adds only DOM, React Aria, and virtualizer glue. | AI SDK |
| State transitions go through pure reducers over immutable state, unions are matched exhaustively (`satisfies never`), and `getSnapshot()` never starts work | This package |
| No state or ref writes during render: `useLatest` and `useStableCallback` for values handlers read; props sync into a store in a layout effect keyed on them. `useExhaustiveDependencies` is on; an exception says why on one line | Base UI |

## Releasing

Changes to a published package come with a changeset (`npm run changeset`). The four packages version together (`"fixed"` in `.changeset/config.json`), and `.github/version-check.mjs` checks that they do. Changesets is in prerelease mode (`.changeset/pre.json`, tag `alpha`), so versions are `1.0.0-alpha.N` until `npx changeset pre exit`. The first publish sets both the `alpha` and `latest` dist-tags. Later alphas publish to `latest`, so the docs install without a tag. The Release workflow, run by hand, opens a "Version packages" PR that applies the changesets (`npm run version-packages`). The workflow does not publish. Publishing requires the owner's npm account.

The Release and Upstream workflows open their PRs with `GITHUB_TOKEN`. GitHub starts no workflow runs for events that this token causes, so CI does not run on those PRs. To run it, give the workflows a personal access token or a GitHub App token as a secret. Otherwise, run `npm run release:check` locally before you merge.

To publish:

1. Fast-forward `main` to the release branch. Run the Release workflow, and merge the "Version packages" PR. Check that all four packages are at the same version.
2. On the release commit, run `npm ci` and `npm run release:check`. It runs the typecheck, Biome, the unit tests, the builds, the size budgets, publint and attw (`npm run lint:packages`), the version check, the Twemoji font build and its publint (skipped without Python 3.12; set `PYTHON`), and the packed-install smoke test (`npm run smoke`: Vite, React 18 with a server render, a Next.js App Router build, and `shadcn add`). It then runs every e2e spec, including visual, and axe against a production build. Visual baselines are local, so this is the only run that checks them. If they are not in `apps/demo/e2e/__snapshots__`, restore them first.
3. Publish, and push the tags. Pre mode rejects `--tag`.

   ```bash
   npm whoami
   npx changeset publish          # add --otp <code> with 2FA
   git push origin --follow-tags
   ```

   `changeset publish` is not atomic. If a package fails to publish, run it again: it skips versions that are already published. `prepublishOnly` builds core and the React package. The data package and the Twemoji font build when they are packed.

4. Check the dist-tags. `latest` must be the new version for all four packages.

   ```bash
   for p in core data react twemoji-font; do npm view @brianhung/emoji-picker-$p dist-tags; done
   npm dist-tag add @brianhung/emoji-picker-<package>@<version> latest   # if latest is missing or behind
   ```

5. Check the CDN and a fresh install.

   ```bash
   curl -sI https://cdn.jsdelivr.net/npm/@brianhung/emoji-picker-core@<version>/data/en.json | head -1
   curl -sI https://cdn.jsdelivr.net/npm/@brianhung/emoji-picker-data@<version>/data/ja/iamcal.json | head -1
   npx shadcn@latest add https://emoji.brianhung.me/r/emoji-picker.json   # in a fresh Vite and Tailwind app
   ```
