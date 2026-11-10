# Contributing

## Repository layout

| Path | Contents |
|---|---|
| `packages/core` | [`@emoji-components/core`](packages/core/README.md): data, search, and stores, with no dependencies |
| `packages/react` | [`emoji-components`](packages/react/README.md): the React parts and hooks |
| `packages/data` | [`@emoji-components/data`](packages/data/README.md): datasets for every Emojibase locale and shortcode set, built at pack time |
| `packages/twemoji-font` | [`@emoji-components/twemoji-font`](packages/twemoji-font/README.md): Twemoji as a COLRv0 web font, built with nanoemoji (Python 3.12) in CI, at pack time, or by `npm run build:font`. Without a local build, the site loads the published CSS from jsDelivr. |
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
npm run api            # after `npm run build`: rewrite packages/core/api.md and packages/react/api.md, and check exports and names
npm run smoke          # packed tarballs in fresh Vite, React 18, Next.js, and shadcn apps
npm run onboarding     # docs.md's install and usage in apps from the Vite, Next.js, and shadcn CLIs; --from-npm after publishing
npm run release:check  # .github/release-steps.mjs: everything above, plus visual and axe on a production build
npm run changeset      # describe a change for the next release
```

In the workspace, the site resolves the packages to their TypeScript source through the `@emoji-components/source` export condition, so library edits reload without a build.

The e2e, axe, and screen reader suites serve the site on port 5199 (5198 with `E2E_BUILD=1`); set `E2E_PORT` to use another, for example beside a running dev server or a second checkout. With `E2E_PORT` set, the suites start their own server and never reuse one.

Visual baselines are local. Capture them with `npm run test:baseline -w demo`.

### CI

- [ci.yml](.github/workflows/ci.yml) runs the same step groups as `release:check` from `.github/release-steps.mjs` (`check`, `smoke`, `e2e`, `a11y`), with `E2E_VISUAL=0` because visual baselines are local, plus the Twemoji font build and its Chromium, WebKit, and Firefox render test.
- [screen-readers.yml](.github/workflows/screen-readers.yml) runs VoiceOver and NVDA.
- [upstream.yml](.github/workflows/upstream.yml), run by hand, bumps the pinned emojibase-data and Twemoji versions, rebuilds, runs the tests, and opens a PR.

## Package layout

`packages/react/src` follows Base UI's: a folder per component (`picker`, `popover`, `suggestions`, `emoji`, `provider`), a folder per part named after it (`picker/list-cell/EmojiPickerListCell.tsx`), and beside each part its context (`…Context.ts`), its data attributes (`…DataAttributes.ts`), and its CSS variables (`…CssVars.ts`). A component's `index.parts.ts` lists its one-level parts and its `index.ts` exports the namespace, the types, and the attribute constants. Hooks live in the folder of the part they serve (`picker/root/utils/useEmojiPickerActions.ts`); code shared across components is in `internals` and `utils`. `EmojiPopover` and `EmojiSuggestions` keep adapter-neutral parts, types, and attribute files in `popover/` and `suggestions/`, and one folder per positioning library (`popover/floating-ui`, `popover/react-aria`), as Base UI's `ContextMenu` builds on `Menu`.

`packages/core/api.md` and `packages/react/api.md` list each entry's value and type exports, part props, `data-slot` values, data attributes, CSS variables, stylesheets, storage keys, and registry items. `npm run api` ([.github/api.mjs](.github/api.mjs)) regenerates them from the built dist. The `check` step of `release:check` fails when a `.d.ts` value export is missing at runtime (or the reverse), when a consumer's declaration emit hits TS2742, when a name breaks the rules under [API conventions](#api-conventions), or when the committed reports differ from the build.

The docs' data attribute and CSS variable tables are generated from the `…DataAttributes.ts` and `…CssVars.ts` files ([apps/demo/plugins/api-reference.ts](apps/demo/plugins/api-reference.ts)): a constant's JSDoc is its description, `@type` its type, and `@default` its default. A new attribute file needs a section there, or the site build fails.

## API conventions

The API shape follows Base UI. Behavior follows React Aria.

A name belongs to the code that defines and reads it. Code only one component uses takes that component's name: `EmojiPicker*`, `useEmojiPicker*`, and `emoji-picker-*` in `picker/`; `EmojiPopover*` and `emoji-popover-*` in `popover/`; `EmojiSuggestions*` and `emoji-suggestions-*` in `suggestions/`; `EmojiReactionBar*` and `emoji-reaction-bar` in `reaction-bar/`; `Emoji*` and `emoji` in `emoji/`. Code several components share (`internals/`) takes `EmojiComponents*`, as Base UI's `BaseUIEvent` and `preventBaseUIHandler`; storage keys and the default event type use `emoji-components`. Names in `provider/` and `use-emoji-suggestions/` serve the whole library and only need to say `Emoji`. A part's `data-slot` is its component and part names in kebab case (`emoji-picker-list-cell`), and a Root's is its component's. `.github/api.mjs` checks these rules, and its allowlist says why each exception exists.

| Rule | Source |
|---|---|
| Parts are one-level namespace members (`EmojiPicker.Root`, `EmojiPicker.ListCell`); types are namespaced on the part (`EmojiPicker.Root.Props`, `.State`, `.Actions`) beside flat type aliases | Base UI |
| Every part takes `render`, `className`, and `style`, each a value or a function of state | Base UI |
| State is `x` / `defaultX` / `onXChange(value, details)`; `details` is `{ reason, event, cancel(), isCanceled, allowPropagation(), isPropagationAllowed }` | Base UI |
| Reasons use Base UI's names: `trigger-press`, `outside-press`, `escape-key`, `item-press`, `focus-out`, `input-change`, `clear-press`, `imperative-action`, `none`; a highlight moves by `keyboard`, `pointer`, or `none`, as in `onItemHighlighted` | Base UI |
| A popover that closes because the page scrolls reports `scroll`; frequently used emoji report `pick`, `remove`, and `clear`. Base UI has no counterpart for these. | This package |
| Imperative calls go through `actionsRef`; `event.preventEmojiComponentsHandler()`, on every handler a part composes with its own, skips the part's handler | Base UI |
| State attributes: `data-highlighted` (keyboard or pointer), `data-selected`, `data-pressed`, `data-disabled`, `data-open` / `data-closed`, `data-popup-open`, `data-starting-style` / `data-ending-style`, present as `""` or absent | Base UI |
| Emoji values are unified codes; a highlight's section-scoped key is `details.key` | Base UI (item values) |
| ARIA patterns, focus management, virtual focus (`aria-activedescendant`), and keyboard delegates | React Aria |
| Press, hover, and focus-ring state through `usePress`, `useHover`, and `useFocusRing` (`data-hovered`, `data-pressed`, `data-focus-visible`) on buttons, cells, and tabs | React Aria |
| Locale, RTL, and collation through `I18nProvider` and `useLocale` | React Aria |
| Collections take render-function children and `renderEmptyState`; layout and virtualization follow `Virtualizer` / `Layout` | React Aria |
| `ListSection` is a collection branch and `ListSectionTitle`, `ListItems`, and `ListSectionActions` are leaves (`createBranchComponent`, `createLeafComponent`), built by `CollectionBuilder` from List's children and rendered with `node.render(node)`; the emoji themselves come from data, not from collection nodes | React Aria |
| Headless hooks return prop getters (`getListProps`, `getOptionProps`) that merge the props you pass, as `useAutocomplete` returns `inputProps` and `collectionProps` | React Aria |
| Core holds the framework-neutral engine: the store, search, suggestions, and picker state (`createEmojiPicker`), with grid math on `/grid` and native support on `/native`. Snapshots are read-only and actions are methods, as in the AI SDK's `AbstractChat`; private state stays in closures. React binds through core's public API and adds only DOM, React Aria, and virtualizer glue. | AI SDK |
| State transitions go through pure reducers over immutable state, unions are matched exhaustively (`satisfies never`), and `getSnapshot()` never starts work | This package |
| No state or ref writes during render: `useLatest` and `useStableCallback` for values handlers read; props sync into a store in a layout effect keyed on them. `useExhaustiveDependencies` is on; an exception says why on one line | Base UI |

## Releasing

Changes to a published package come with a changeset (`npm run changeset`). The four packages version together (`"fixed"` in `.changeset/config.json`), and `.github/version-check.mjs` checks that they do. Changesets is in prerelease mode (`.changeset/pre.json`, tag `alpha`), so versions are `1.0.0-alpha.N` until `npx changeset pre exit`. The first publish sets both the `alpha` and `latest` dist-tags. Later alphas publish to `latest`, so the docs install without a tag. The Release workflow, run by hand, opens a "Version packages" PR that applies the changesets (`npm run version-packages`). The workflow does not publish. Publishing requires the owner's npm account.

The Release and Upstream workflows open their PRs with `GITHUB_TOKEN`. GitHub starts no workflow runs for events that this token causes, so CI does not run on those PRs. To run it, give the workflows a personal access token or a GitHub App token as a secret. Otherwise, run `npm run release:check` locally before you merge.

To publish:

1. Fast-forward `main` to the release branch. Run the Release workflow, and merge the "Version packages" PR. Check that all four packages are at the same version.
2. On the release commit, run `npm ci` and `npm run release:check` (every group in `.github/release-steps.mjs`; pass group names to run some). It runs the typecheck, Biome, the unit tests, the builds, the size budgets, publint and attw (`npm run lint:packages`), the version check, the Twemoji font build and its publint (skipped without Python 3.12; set `PYTHON`), and the packed-install smoke test (`npm run smoke`: Vite, React 18 with a server render, a Next.js App Router build, and `shadcn add`), and the onboarding check (`npm run onboarding`: docs.md's steps in apps from the Vite, Next.js, and shadcn CLIs). It then runs every e2e spec, including visual, and axe against a production build. Visual baselines are local, so this is the only run that checks them. If they are not in `apps/demo/e2e/__snapshots__`, restore them first.
3. Publish, and push the tags. Pre mode rejects `--tag`.

   ```bash
   npm whoami
   PYTHON=python3.12 npx changeset publish   # any Python 3.12+; add --otp <code> with 2FA
   git push origin --follow-tags
   ```

   `changeset publish` is not atomic. If a package fails to publish, run it again: it skips versions that are already published. `prepublishOnly` builds core and the React package. The data package and the Twemoji font build when they are packed; the font needs Python 3.12 or later, so set `PYTHON` if `python3` is older (macOS ships 3.9).

4. Check the dist-tags. `latest` must be the new version for all four packages.

   ```bash
   for p in emoji-components @emoji-components/{core,data,twemoji-font}; do npm view $p dist-tags; done
   npm dist-tag add <package>@<version> latest   # if latest is missing or behind
   ```

5. Check the CDN and a fresh install.

   ```bash
   curl -sI https://cdn.jsdelivr.net/npm/@emoji-components/data@<version>/data/en/iamcal.json | head -1
   curl -sI https://cdn.jsdelivr.net/npm/emoji-components@latest/r/emoji-picker.json | grep -i "^HTTP\|x-jsd-version"
   npm run onboarding -- --from-npm   # docs.md's steps against npm, the registry on jsDelivr, and jsDelivr data
   ```

### shadcn registry

`emoji-components` ships the registry items in `r/`, built by its `prepack` (`apps/demo/scripts/build-registry.mjs`). Items pin the packages to the release (`emoji-components@<version>`) and depend on each other through that release's jsDelivr URLs. The site keeps serving the same items at `/r/` for URL installs.

The docs install from `https://cdn.jsdelivr.net/npm/emoji-components@latest/r/<item>.json`, which follows the `latest` dist-tag, so step 4 matters: `emoji-components@latest` was `0.0.0`, which has no `r/`. jsDelivr caches `@latest` for up to 7 days unless it is purged, and items pin their own release, so a stale cache installs an older but consistent release. A range such as `@1` excludes prereleases. The URL needs no change at 1.0.0. At 2.0.0, `latest` moves to 2.x.
