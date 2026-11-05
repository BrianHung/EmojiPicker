# Contributing

## Repository layout

| Path | Contents |
|---|---|
| `packages/core` | [`@brianhung/emoji-picker-core`](packages/core/README.md): data, search and stores, with no dependencies |
| `packages/react` | [`@brianhung/emoji-picker-react`](packages/react/README.md): the React parts and hooks |
| `packages/data` | [`@brianhung/emoji-picker-data`](packages/data/README.md): datasets for every emojibase locale and shortcode set, built at pack time |
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

## API conventions

Base UI's surface, React Aria's engine. Base UI wins on API shape; React Aria wins on behaviour.

| Rule | Source |
|---|---|
| Parts compose (`EmojiPicker.Root`, `List.Cell`); types are namespaced on the part (`EmojiPicker.Root.Props`, `.State`, `.Actions`) beside flat aliases | Base UI |
| Every part takes `render`, `className` and `style`, each a value or a function of state | Base UI |
| State is `x` / `defaultX` / `onXChange(value, details)`; `details` is `{ reason, event, cancel(), isCanceled, allowPropagation(), isPropagationAllowed }` | Base UI |
| Reasons use Base UI's names: `trigger-press`, `outside-press`, `escape-key`, `item-press`, `focus-out`, `imperative-action`, `none` | Base UI |
| Imperative calls go through `actionsRef`; `event.preventEmojiPickerHandler()` skips a part's own key handling | Base UI |
| State attributes: `data-highlighted`, `data-selected`, `data-pressed`, `data-disabled`, `data-open` / `data-closed`, `data-popup-open`, `data-starting-style` / `data-ending-style` | Base UI |
| ARIA patterns, focus management, virtual focus (`aria-activedescendant`) and keyboard delegates | React Aria |
| Press, hover and focus-ring state through `usePress`, `useHover`, `useFocusRing` (`data-hovered`, `data-focus-visible`) | React Aria |
| Locale, RTL and collation through `I18nProvider` and `useLocale` | React Aria |
| Collections take render-function children and `renderEmptyState`; layout and virtualization follow `Virtualizer` / `Layout` | React Aria |
| Headless hooks return prop getters (`getListProps`, `getOptionProps`), as `useAutocomplete` returns `inputProps` and `collectionProps` | React Aria |

## Releasing

Changes to a published package come with a changeset (`npm run changeset`). The Release workflow, run by hand, opens a "Version packages" PR that applies them (`npm run version-packages`). It never publishes; publishing needs the owner's npm account:

```bash
npm run build -w @brianhung/emoji-picker-core && npm run build -w @brianhung/emoji-picker-react
npx changeset publish
```
