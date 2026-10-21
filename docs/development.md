# Development

## Prerequisites

- **Node.js 22+** (see `.nvmrc`)
- npm 10+
- A GitHub personal access token for full-rate-limit local testing (optional but
  recommended)

## Setup

```bash
git clone https://github.com/KetanDutt/github-readme-stats.git
cd github-readme-stats
npm install
cp .env.example .env    # add PAT_1=...
```

## Running locally

Two equivalent options:

### Bundled Express server (recommended)

```bash
npm start        # production mode: HTTP + memory caching enabled, port 9000
npm run dev      # watch mode, NODE_ENV=development (caching disabled)
```

Then open:

- <http://localhost:9000> — dashboard with live example cards
- <http://localhost:9000/health> — machine-readable health probe
- <http://localhost:9000/api?username=anuraghazra> — a card

`npm run dev` passes `--dev` to `express.js`, which sets
`NODE_ENV=development`. You can also set `NODE_ENV` in `.env`; it takes
precedence.

### Vercel CLI

```bash
npm i -g vercel
vercel dev
```

Add `NODE_ENV=development` to `.env` to disable caching while iterating on a
card.

## npm scripts

| Script                        | Description                                                        |
| ----------------------------- | ------------------------------------------------------------------ |
| `npm start`                   | Start the Express server in production mode.                       |
| `npm run dev`                 | Start the Express server in watch/development mode.                |
| `npm test`                    | Run all unit/API tests with coverage (thresholds enforced).        |
| `npm run test:watch`          | Re-run tests on change.                                            |
| `npm run test:update:snapshot`| Update Jest snapshots after an intentional rendering change.       |
| `npm run test:e2e`            | End-to-end tests against a live deployment (see below).            |
| `npm run lint`                | ESLint over `src`, `api`, `tests`, `scripts`, `themes`, `express.js`. |
| `npm run format`              | Format the repository with Prettier.                               |
| `npm run format:check`        | Verify formatting without writing.                                 |
| `npm run bench`               | Run rendering/API benchmarks.                                      |
| `npm run theme-readme-gen`    | Regenerate `themes/README.md` from `themes/index.js`.              |
| `npm run generate-langs-json` | Refresh `src/common/languageColors.json` from GitHub Linguist.     |

## Tests

```bash
npm test
```

- Tests use Node's ESM with `--experimental-vm-modules` (already wired into the
  npm scripts).
- HTTP calls are mocked with `axios-mock-adapter`; tests never hit the network.
- Coverage thresholds (90% statements/lines/functions, 80% branches) are
  enforced by `jest.config.js`.
- Snapshot changes should be reviewed, not blindly accepted:

```bash
npm run test:update:snapshot
git diff tests/__snapshots__
```

### End-to-end tests

`tests/e2e/e2e.test.js` compares cards rendered by a live deployment with local
rendering. Point it at your instance:

```bash
E2E_HOST=https://your-instance.example.com npm run test:e2e
```

See `tests/e2e/e2e.test.js` for the default host and fixtures.

## Linting and formatting

```bash
npm run lint
npm run format:check
```

The pre-commit hook (`.husky/pre-commit`) runs tests, ESLint and Prettier via
`lint-staged`. If a commit is rejected, fix the reported issues instead of using
`--no-verify`.

## Benchmarks

```bash
npm run bench
```

Benchmarks measure card rendering, rank calculation and API handler throughput.
Use them to compare before/after numbers when optimizing. They print min, max,
median and p95/p99 latencies.

## Debugging

- **VS Code**: use *Node.js: Attach to process* or the Jest extension to debug
  tests.
- **Card HTML/SVG**: cards are plain strings — log them or open the endpoint and
  view source.
- **Rate limits**: `curl localhost:9000/api/status/pat-info` shows each token's
  status and remaining quota.
- **Caching confusion**: run with `NODE_ENV=development` (or `MEMORY_CACHE=false`)
  and add `cache_seconds=0` to bypass CDN/browser caches.

## Repository policies

- **No CI and no GitHub Actions workflows** — all checks run locally. Do not add
  `.github/workflows/`.
- **Theme additions are paused** — use customization options instead.
- Keep the API surface documented: any new parameter belongs in
  [`docs/api-reference.md`](./api-reference.md).
- Update the docs and readme whenever behaviour or configuration changes.

## Commit conventions

The project uses human-readable conventional-style messages, e.g.:

```
fix(wakatime): guard against missing response objects
feat(server): add in-memory SVG cache
docs: add deployment guide
```

Small, focused commits with tests are preferred.
