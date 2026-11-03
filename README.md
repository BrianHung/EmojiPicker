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
npm run build        # the library, then the site and registry
```

In the workspace, the demo resolves `@brianhung/emoji-picker` to the library's TypeScript source through the `@brianhung/source` export condition, so library edits reload without a build.

## License

MIT. Third-party notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
