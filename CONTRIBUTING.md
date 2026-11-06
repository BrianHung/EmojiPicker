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
| Reasons use Base UI's names: `trigger-press`, `outside-press`, `escape-key`, `item-press`, `focus-out`, `input-change`, `imperative-action`, `none`; a highlight moves by `keyboard`, `pointer`, or `none`, as in `onItemHighlighted` | Base UI |
| A popover that closes because the page scrolls reports `scroll`; frequently used emoji report `pick`, `remove`, and `clear`. Base UI has no counterpart for these. | This package |
| Imperative calls go through `actionsRef`; `event.preventEmojiPickerHandler()` skips a part's own key handling | Base UI |
| State attributes: `data-highlighted`, `data-selected`, `data-pressed`, `data-disabled`, `data-open` / `data-closed`, `data-popup-open`, `data-starting-style` / `data-ending-style` | Base UI |
| ARIA patterns, focus management, virtual focus (`aria-activedescendant`), and keyboard delegates | React Aria |
| Press, hover, and focus-ring state through `usePress`, `useHover`, and `useFocusRing` (`data-hovered`, `data-pressed`, `data-focus-visible`) on buttons, cells, and tabs | React Aria |
| Locale, RTL, and collation through `I18nProvider` and `useLocale` | React Aria |
| Collections take render-function children and `renderEmptyState`; layout and virtualization follow `Virtualizer` / `Layout` | React Aria |
| Headless hooks return prop getters (`getListProps`, `getOptionProps`), as `useAutocomplete` returns `inputProps` and `collectionProps` | React Aria |

## Releasing

Changes to a published package come with a changeset (`npm run changeset`). Changesets is in prerelease mode (`.changeset/pre.json`, tag `alpha`), so versions are `1.0.0-alpha.N` until `npx changeset pre exit`. In this mode, `changeset publish` publishes under the `alpha` dist-tag. The Release workflow, run by hand, opens a "Version packages" PR that applies the changesets (`npm run version-packages`). The workflow does not publish. Publishing requires the owner's npm account.

Before publishing, on the release commit:

1. Run `npm run release:check`. It runs the typecheck, Biome, the unit tests, the builds, the size budgets, publint and attw (`npm run lint:packages`), and the packed-install smoke test (`npm run smoke`: Vite, a Next.js App Router build, and `shadcn add` of the registry item). It then runs every e2e spec, including visual, and axe against a production build. Visual baselines are local, so this is the only run that checks them. If they are not in `apps/demo/e2e/__snapshots__`, restore them first.
2. Publish:

```bash
npx changeset publish
```

`prepublishOnly` builds core and the React package. The data package and the Twemoji font build when they are packed.
