# Architecture

GitHub Readme Stats is a stateless SVG generator. A request is handled in four
stages: **validate → fetch → render → cache**.

## Request lifecycle

```
GET /api?username=octocat&show_icons=true
        │
        ▼
api/index.js ──► guardAccess()        whitelist / blacklist
        │      ├─ normalizeString()   locale
        │      ├─ isValidCommitsYear()
        │      ▼
        │   fetchStats() ──► retryer() ──► GitHub GraphQL API
        │      │                          (+ REST API for include_all_commits)
        │      ▼
        │   renderStatsCard() ──► Card ──► SVG string
        │      │
        │      ▼
        └──► setCacheHeaders() ──► res.send(svg)
```

1. **Validation** — the handler sets `Content-Type`, checks the whitelist /
   blacklist, normalizes scalar and list query parameters and rejects invalid
   values with an SVG error card.
2. **Fetching** — fetchers call the GitHub GraphQL API through
   [`src/common/http.js`](../src/common/http.js), which applies a timeout and
   keep-alive agents. [`retryer.js`](../src/common/retryer.js) rotates through
   the configured `PAT_*` tokens on rate limits or invalid credentials and
   throws a typed `CustomError` when all tokens are exhausted.
3. **Rendering** — cards build a `Card` instance (size, colors, CSS, a11y
   labels) and append SVG fragments. Colors come from
   [`color.js`](../src/common/color.js), text from
   [`translations.js`](../src/translations.js) via `I18n`.
4. **Caching** — HTTP cache headers are always set. The bundled Express server
   additionally keeps rendered SVGs in an LRU memory cache.

## Module map

| Path                       | Responsibility                                                                 |
| -------------------------- | ------------------------------------------------------------------------------ |
| `api/*.js`                 | Serverless entry points: validation, cache headers, error cards.               |
| `api/status/*.js`          | Token uptime and health reporting.                                              |
| `src/cards/*.js`           | SVG renderers; each card exports a `renderXCard(data, options)` function.       |
| `src/common/Card.js`       | SVG shell: `<title>`, `<desc>`, background, border, title, animations.          |
| `src/common/render.js`     | Layout and drawing primitives (`flexLayout`, `measureText`, progress nodes).    |
| `src/common/color.js`      | Theme resolution, hex validation, gradient parsing.                             |
| `src/common/ops.js`        | Query parameter parsing (`parseArray`, `parseBoolean`, …) and helpers.          |
| `src/common/cache.js`      | Cache TTL constants and `Cache-Control` headers.                                |
| `src/common/memory-cache.js`| LRU/TTL cache and the Express middleware that caches SVGs.                      |
| `src/common/api.js`        | Shared response builders used by every API handler.                             |
| `src/common/http.js`       | GitHub GraphQL request helper, timeouts, keep-alive agents.                     |
| `src/common/retryer.js`    | Token rotation and retry policy.                                                |
| `src/fetchers/*.js`        | Data retrieval and normalization (stats, languages, repo, gist, WakaTime).      |
| `src/calculateRank.js`     | Rank calculation used by the stats card.                                        |
| `src/translations.js`      | All localized strings and the list of available locales.                        |
| `themes/index.js`          | Theme definitions.                                                              |
| `express.js`               | Self-hosted HTTP server (routing, compression, cache, health, landing page).    |

## Rendering model

Cards are pure functions of `(data, options)` that return an SVG string. This
makes them easy to snapshot-test and means the same renderer works on Vercel,
Express, or in a future build-time generator.

- **Layout** — [`flexLayout()`](../src/common/render.js) positions items in a row
  or column. Empty items are skipped together with their size so hidden
  elements never shift their neighbours.
- **Text safety** — every user-controlled string is passed through
  [`encodeHTML()`](../src/common/html.js) before being inserted into the SVG.
- **Accessibility** — cards render `role="img"`, a `<title>` and a `<desc>`
  (`aria-labelledby="titleId descId"`).
- **Animation** — the card CSS includes keyframes; `disable_animations`
  neutralizes them, and test runs omit keyframes entirely to keep snapshots
  stable.
- **Gradients** — `bg_color=angle,c1,c2` is rendered as a `<linearGradient>`.

## Extension guides

### Add a query option to an existing card

1. Add the option to the JSDoc typedef in `src/cards/types.d.ts`.
2. Destructure and handle it in `renderXCard` (with a safe default).
3. Read it in the matching `api/*.js` handler, normalize it with a helper from
   `src/common/ops.js` and pass it to the renderer.
4. Document it in [`docs/api-reference.md`](./api-reference.md).
5. Add a test in `tests/renderXCard.test.js` and, for validation, in the API
   test suite.

### Add a new card

1. Create `src/fetchers/<name>.js` with a typed fetcher that throws
   `MissingParamError` / `CustomError` on expected failures.
2. Create `src/cards/<name>.js` exporting `render<Name>Card(data, options)`.
   Reuse `Card`, `flexLayout` and the color helpers.
3. Create `api/<name>.js` following the pattern of the existing handlers
   (`setSvgContentType` → `guardAccess` → validation → fetch → render).
4. Register the route in `express.js` (`router.get("/<name>", ...)`).
5. Add `tests/fetch<Name>.test.js`, `tests/render<Name>Card.test.js` and
   `tests/<name>.test.js` for the handler.
6. Document the endpoint and parameters.

### Add a locale

1. Add the language code and translations to every object in
   `src/translations.js`.
2. Add the code to `availableLocales`.
3. Run `npm test` — the i18n test verifies completeness.

### Add a theme

Theme additions are paused for the upstream project, but for a private instance
you can add an entry to `themes/index.js` and run
`npm run theme-readme-gen` to regenerate `themes/README.md`.

## Testing strategy

| Layer        | Test files                                   | What is verified                                  |
| ------------ | -------------------------------------------- | ------------------------------------------------- |
| Utilities    | `tests/ops`, `color`, `fmt`, `html`, `render` | Pure helper behaviour and edge cases.             |
| Fetchers     | `tests/fetch*.test.js`                       | GraphQL/REST payload handling and error paths.    |
| Cards        | `tests/render*Card.test.js`                  | Layout, colors, locales, accessibility, snapshots.|
| API handlers | `tests/api`, `pin`, `gist`, `top-langs`, ...  | Validation, cache headers, error cards.           |
| Server       | `tests/express.test.js`                      | Routing, health, hardening headers, 404s.         |
| Performance  | `tests/bench/*.bench.js`                     | Regression benchmarks (`npm run bench`).          |

All tests run locally; there is no CI. See [Development](./development.md).
