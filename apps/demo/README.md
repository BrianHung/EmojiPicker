# Demo site

The documentation site for `@brianhung/emoji-picker`, served at [emoji.brianhung.me](https://emoji.brianhung.me). It's a Vite multipage app plus a Cloudflare Worker that serves `/api/*` for the [semantic search example](https://emoji.brianhung.me/examples/semantic-search/). Both deploy as one Worker.

## Run locally

From the repository root:

```sh
npm install
npm run dev -w demo   # http://localhost:5199
```

Workers AI and Vectorize have no local mode, so `/api/embed-search` and `/api/decide` return `503` in development and the page falls back to lexical search. To use the real bindings, sign in with Wrangler and set `CLOUDFLARE_REMOTE_BINDINGS=1`.

## Project layout

| Path | Contents |
|---|---|
| `index.html`, `gallery/`, `examples/**/index.html` | Page entries. Each path is its URL. |
| `src/pages/` | Each page's `main.tsx`. Example pages are a `page.mdx` and a live demo. |
| `src/styles/<app>/` | An app style: a `picker.tsx` layout and a `scene.tsx` mockup. |
| `src/components/` | shadcn components (`ui/`), site chrome (`site/`), and the Tiptap, Lexical and autocomplete integrations. |
| `registry/` | The shadcn registry item. `npm run build:registry` writes it to `public/r/`. |
| `plugins/` | MDX, and the Markdown routes `/docs.md`, `/examples/*.md` and `/llms.txt`. |
| `worker/` | The Worker for `/api/*`. |
| `capture/`, `shot.html` | Screenshot and parity tooling. |

## Deploy

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/BrianHung/EmojiPicker/tree/main/apps/demo)

Or, from `apps/demo` with Wrangler:

```sh
npm run create-index           # Vectorize index emoji-bge-large, 1,024 dimensions, cosine
npm run build && npm run deploy
npx wrangler secret put ADMIN_TOKEN
npm run seed -- --url https://emoji-picker.<subdomain>.workers.dev --token "$ADMIN_TOKEN"
```

`npm run seed` embeds every emoji into the index and is safe to run again. Add `--custom ./my-emoji.json` to index your own emoji too.

The Worker is configured in both `cloudflare.config.ts` (for the `cf` CLI) and `wrangler.jsonc` (for the Deploy button and Workers Builds). Keep them in sync; `npm test` fails if they differ. To call the API from another origin, add it to `ALLOWED_ORIGINS` and build the pages with `VITE_SEARCH_API_URL` set to the Worker's URL.

## API

| Route | Body | Response |
|---|---|---|
| `POST /api/embed-search` | `{ query, limit?, custom? }` | `{ hits, model, timings }` |
| `POST /api/decide` | `{ query, model, limit?, custom? }` | `{ hits, model, usage, timings }` |
| `POST /api/admin/seed` | `{ from?, count?, custom? }` with `Authorization: Bearer <ADMIN_TOKEN>` | `{ total, from, next, done, upserted, mutationIds }` |
| `GET /api/health` | | Corpus size, index size and model ids |

`limit` is 1–50 and defaults to 24. `custom: true` includes custom emoji. `model` is one of the keys of `CATALOG` in `worker/decide.ts`: `clef-flash`, `clef-omni`, `clef` or `jev`. An unreachable binding or an empty index returns `503`.

`/api/embed-search` embeds the query with `@cf/baai/bge-large-en-v1.5` and queries Vectorize. `/api/decide` asks a decision model in two rounds, since a question takes at most 255 options: the emoji names in groups of 250, then one question over each group's top picks.

## Custom emoji

The search corpus includes `src/lib/semantic-search/custom-emoji.json`, in the library's `CustomEmoji` shape with an optional `description`. To build the on-device index for your own set:

```sh
npx tsx scripts/embed-emoji.ts --custom ./my-emoji.json --out public/embeddings/custom.i8
```

## Test

```sh
npm test            # Worker tests, with Workers AI and Vectorize mocked
npm run typecheck
npx tsx worker/test/mock-server.ts --port 8799   # the Worker over mocked bindings
```
