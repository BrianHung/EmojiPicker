# emojis.brianhung.me

The docs site for `@brianhung/emoji-picker`: a Vite multi-page app, plus a Cloudflare Worker (`worker/`) that serves `/api/*` for the [semantic search example](https://emojis.brianhung.me/examples/semantic-search/). Both deploy together as one Worker: the pages as static assets, `/api/*` to the Worker.

```sh
npm install           # at the repository root
npm run dev -w demo   # http://localhost:5199
```

In `npm run dev`, the Cloudflare Vite plugin runs the Worker locally. Workers AI and Vectorize have no local mode, so `/api/embed-search` and `/api/decide` answer `503 {"error":"unavailable"}` and the page falls back to lexical search. To use the real bindings in dev, log in and run `CLOUDFLARE_REMOTE_BINDINGS=1 npm run dev -w demo`.

## Layout

- `index.html`, `gallery/`, `examples/**/index.html`, `shot.html`: the page entries (Vite multi-page; the paths are the URLs).
- `src/pages/<route>/`: each page's `main.tsx` and page-only components. The example pages are `page.mdx` (prose and code) plus their live demo.
- `src/styles/<app>/`: each app style, a `picker.tsx` layout and a `scene.tsx` mockup; `src/styles/index.ts` lists them.
- `src/components/`: `ui/` (shadcn), `site/` (shell, docs primitives, MDX components, table of contents), and the reusable demo components (Tiptap and Lexical integrations, autocomplete, the Base UI-style demos).
- `registry/`: the shadcn registry item (`npm run build:registry` writes `public/r/`). The site renders it as `@/registry/emoji-picker`.
- `plugins/`: MDX and the Markdown routes (`/docs.md`, `/examples/*.md`, `/llms.txt`, built from the package README and each `page.mdx`).
- `worker/`: the Cloudflare Worker for `/api/*`. `capture/`: the screenshot and parity harness (`/shot.html`).

## Deploy your own

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/BrianHung/EmojiPicker/tree/main/apps/demo)

The semantic search page has three approaches. On device needs nothing on the server. The other two run on this Worker:

| Approach | Route | Uses |
|---|---|---|
| Vector DB | `POST /api/embed-search` | Workers AI (`@cf/baai/bge-large-en-v1.5`) and the Vectorize index `emoji-bge-large` |
| Decision model | `POST /api/decide` | Workers AI: Clef (`@cf/cloudflare/clef-flash`) or Jev (`typesafe/jev`), through AI Gateway |

What gets created in your account:

| | Name | How |
|---|---|---|
| Worker + static assets | `emoji-picker` | the deploy |
| Workers AI binding `AI` | | the deploy |
| Vectorize index, 1,024 dimensions, cosine | `emoji-bge-large` | `npm run create-index` |
| AI Gateway | `default` | created on its first request |
| Secret | `ADMIN_TOKEN` | asked for by the button, or set with the CLI |

Clef and Jev are both served by Workers AI through the `AI` binding: no other provider or API key. Nothing in the config names an account: deploys go to the account you're logged in to.

### With the `cf` CLI

From `apps/demo`:

```sh
npx cf auth login
npm run create-index    # the Vectorize index, before the first deploy
npx cf deploy           # builds the site and the Worker

# The token that guards POST /api/admin/seed
export ADMIN_TOKEN=$(node -e "console.log(crypto.randomUUID())")
npx cf workers secrets update --worker emoji-picker --name ADMIN_TOKEN --type secret_text --text "$ADMIN_TOKEN"

# Embed every emoji into the index (about 2,000 vectors; safe to run again)
npm run seed -- --url https://emoji-picker.<your-subdomain>.workers.dev --token "$ADMIN_TOKEN"
```

`https://emoji-picker.<your-subdomain>.workers.dev/examples/semantic-search/` then answers all three tabs. With more than one account, set `CLOUDFLARE_ACCOUNT_ID` first. To index your own emoji as well, add `--custom ./my-emoji.json` to the seed command.

### With Wrangler

```sh
npm run create-index -w demo
npm run build -w demo && npm run deploy -w demo
npx wrangler secret put ADMIN_TOKEN    # from apps/demo
npm run seed -w demo -- --url https://emoji-picker.<your-subdomain>.workers.dev --token "$ADMIN_TOKEN"
```

### Changing names

The Worker is configured twice: `cloudflare.config.ts` for the `cf` CLI and `wrangler.jsonc` for the Deploy button and Workers Builds, which read only Wrangler config. Change both; `npm test -w demo` fails if they disagree.

- Worker name: `name`. The site's URL follows it.
- Vectorize index: `EMOJI_INDEX`'s index name, and the `create-index` script in `package.json`.
- AI Gateway: `AI_GATEWAY_ID` (default `default`).
- Clef model: `CLEF_MODEL` (`@cf/cloudflare/clef-flash`, or the larger `@cf/cloudflare/clef`).
- Jev model: `JEV_MODEL` (`typesafe/jev`).
- Pages served from another origin: add it to `ALLOWED_ORIGINS` (comma-separated; `*` matches any characters), and build the pages with `VITE_SEARCH_API_URL=https://<worker>` so they call it instead of their own origin.

## The API

| Route | Body | Returns |
|---|---|---|
| `POST /api/embed-search` | `{ query, limit?, custom? }` | `{ hits: [{ unified, score }], model, timings: { embedMs, queryMs } }` |
| `POST /api/decide` | `{ query, model: "clef" \| "jev", limit?, custom? }` | `{ hits, model, usage: { inputTokens, outputTokens, requests, costUsd }, timings: { round1Ms, round2Ms } }` |
| `POST /api/admin/seed` | `{ from?, count?, custom? }`, `Authorization: Bearer <ADMIN_TOKEN>` | `{ total, from, next, done, upserted, mutationIds }` |
| `GET /api/health` | | corpus size, vectors in the index, the decision model ids |

`limit` is 1–50 (default 24). `custom: true` includes custom emoji. A binding that can't be reached, or an empty index, answers `503 {"error":"unavailable","message":…}`.

### Models and costs

**Vector DB.** bge-large-en-v1.5 embeds the query (about 20 tokens) at $0.204 per 1M input tokens, and Vectorize queries about 2,000 stored vectors of 1,024 dimensions at $0.01 per 1M queried dimensions. Seeding embeds about 40,000 tokens once. Per search, both round to a fraction of a cent.

**Decision model.** Clef and Jev speak the same System One protocol: `env.AI.run(model, { state, questions })` returns `{ result: { model, answers, usage } }`, where a choice question gets a probability per option. A question takes 2–255 options, a request at most 64 questions, within a 65,536-token context. So the Worker asks in two rounds: the emoji names in groups of 250 (one request), then one question over the top picks of each group. That is about 11,500 input tokens per search for the built-in set:

| Model | Input, per 1M tokens | Output | Per search |
|---|---|---|---|
| `@cf/cloudflare/clef-flash` | $0.09 | $0.09 | about $0.0010 |
| `@cf/cloudflare/clef` | $0.24 | $0.24 | about $0.0028 |
| `typesafe/jev` | $0.042 | free | about $0.00048 |

## Custom emoji

Custom emoji use the library's `CustomEmoji` shape (`id`, `name`, `imageUrl`, `shortcodes?`, `tags?`, `group?`), plus an optional one-line `description` that is embedded with the name. The page's sample set is `src/lib/semantic-search/custom-emoji.json`; the Worker bundles the same file, so the seed indexes it and the decision models offer those names too.

```sh
# On device: the same int8 format as the built-in index
npx tsx scripts/embed-emoji.ts --custom ./my-emoji.json --out public/embeddings/custom.i8
```

```sh
# Vector DB: embed them into the index next to the built-in set
npm run seed -- --url https://emoji-picker.<your-subdomain>.workers.dev --token "$ADMIN_TOKEN" --custom ./my-emoji.json
```

To have the decision models offer them as well, replace `src/lib/semantic-search/custom-emoji.json` and redeploy.

## Tests

```sh
npm test -w demo        # the Worker, with Workers AI and Vectorize mocked
npm run typecheck -w demo
npx tsx worker/test/mock-server.ts --port 8799   # the real Worker over mocked bindings, for offline UI work
```
