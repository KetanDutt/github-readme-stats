# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
semantic versioning.

## [1.1.0] - 2026-10-21

### Added

- **Documentation**: a complete `docs/` folder covering the API reference,
  configuration, deployment, architecture, development, performance, security
  and troubleshooting, linked from the readme.
- **Self-hosting**: production-ready `Dockerfile`, `docker-compose.yml`,
  `.dockerignore` and `.env.example`; `npm start` and `npm run dev` scripts.
- **Landing page** at `/` for self-hosted instances, with live card previews,
  endpoint reference and instance status badges.
- **`/health` endpoint** returning version, uptime, configured token count and
  memory-cache statistics; wired into the Docker `HEALTHCHECK`.
- **In-memory SVG cache** (`src/common/memory-cache.js`): LRU with per-entry TTL,
  configurable through `MEMORY_CACHE*` environment variables.
- **Status routes in the Express server**: `/api/status/up` and
  `/api/status/pat-info` were previously only available on Vercel.
- **Accessibility labels** (`role="img"`, `<title>`, `<desc>`) for the repo,
  gist, top-languages and WakaTime cards; `aria-labelledby` now references both
  title and description.
- `GITHUB_API_TIMEOUT_MS` and `WAKATIME_API_DOMAIN` environment variables.
- Coverage thresholds in `jest.config.js` and new tests for the cache, server,
  validation and hardening paths.
- `.editorconfig`, `CHANGELOG.md` and a shared API response helper
  (`src/common/api.js`).

### Fixed

- Repeated query parameters (`?hide=a&hide=b`, `?locale=a&locale=b`) no longer
  crash handlers; arrays are normalized and comma lists are trimmed.
- Unknown themes no longer throw `TypeError: Cannot use 'in' operator`; they fall
  back to the default theme.
- Invalid `line_height`, `langs_count`, `number_format`, `number_precision` and
  language weights no longer produce `NaN` in card dimensions or styles.
- WakaTime fetcher no longer throws `TypeError` when a request fails without an
  HTTP response, and 5xx responses are no longer reported as "user not found".
- Retryer now attempts exactly one request per configured `PAT_*` token (it used
  to attempt an extra request with an undefined token), resolves tokens lazily so
  `.env` files are respected, and supports non-contiguous token numbers.
- `flexLayout` keeps each item paired with its own size, so cards without a
  primary language no longer misalign stars/forks.
- Language repository counts are computed per repository, fixing undercounts when
  repositories interleave languages.
- WakaTime rendering no longer mutates the caller's data and no longer divides by
  zero when every language is at 0%.
- `api_domain` is validated to prevent SSRF (no protocols, ports, IP literals or
  localhost).
- Error cards render a solid background when a gradient `bg_color` is requested.
- `getAllPATs` only matches real `PAT_<n>` variables.
- Malformed GraphQL/REST responses (missing `data.user`, `viewer.gist`, empty
  gist files) now produce typed errors instead of `TypeError`s.

### Changed

- `express` moved to runtime dependencies and `compression` added; the server now
  sets `X-Content-Type-Options: nosniff`, disables `X-Powered-By`, returns JSON
  404s for API routes and shuts down gracefully on `SIGTERM`/`SIGINT`.
- Outbound requests use keep-alive agents and a 10 second timeout.
- Input validation errors now hide the "file an issue" link and use consistent
  messages (`Locale not found`, `Incorrect … input`).
- Error card secondary messages are HTML-encoded.
- `vercel.json` applies the function settings to `api/status/*.js` as well.

### Removed

- CI-only theme automation scripts (`scripts/preview-theme.js`,
  `scripts/close-stale-theme-prs.js`, `scripts/helpers.js`,
  `scripts/push-theme-readme.sh`) and their six unused dev dependencies
  (`@actions/core`, `@actions/github`, `color-contrast-checker`, `hjson`,
  `lodash.snakecase`, `parse-diff`).
- Dead `.eslintrc.json` (the repository uses `eslint.config.mjs`).

## [1.0.0]

Initial import of the upstream project.
