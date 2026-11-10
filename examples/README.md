# Examples

Source files to copy into your app. Imports from `@/components/ui/*` are the shadcn registry components.

- `keep-open.tsx`: a shadcn/ui popover that stays open after a pick
- `providers.tsx`: one `EmojiProvider` for the app
- `search.ts`: fuzzy, frequently used first, and server search (`npm install fuse.js`)
- `command-palette.tsx`: `useEmojiSearch` in a list of your own
- `rendering.tsx`: the Twemoji font, with images where the font can't draw (`npm install @emoji-components/core @emoji-components/twemoji-font`)
- `custom-cells.tsx`: cells of your own in the registry picker
