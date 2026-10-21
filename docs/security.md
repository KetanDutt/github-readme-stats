# Security

This project renders untrusted input (usernames, repository names, query
parameters) into images, and talks to the GitHub API using server-side tokens.
The following protections are built in.

## Token handling

- Tokens live only in environment variables (`PAT_1`…`PAT_N`) and are never
  included in responses, logs or rendered SVGs.
- `/api/status/pat-info` reports the **variable names** (`PAT_1`) and their
  status/quota — not the token values. If you consider even that too much
  information, restrict the endpoint at your reverse proxy or do not expose it
  publicly.
- Tokens are rotated automatically when rate limited, invalid or suspended. An
  invalid token is logged as `PAT_n Failed` (name only).
- Use fine-grained tokens with read-only access to public information where
  possible. Grant `repo` scope only if you intentionally include private
  contributions on a private instance.

## Input handling

- Scalar parameters are normalized (`normalizeString`); repeated parameters no
  longer crash handlers.
- Enumerated parameters (`layout`, `stats_format`, `display_format`) are
  validated against allowlists and produce an error card otherwise.
- Numeric parameters are parsed with `parseIntOrUndefined` /
  `parseFloatOrUndefined`, so `NaN` can never reach the SVG output.
- `commits_year` is bounded to `2008`–current year; language weights must be
  finite and non-negative.
- Every user-controlled string is HTML-encoded before being placed in SVG
  markup (`encodeHTML`), including card titles, descriptions and error messages.

## SSRF protection

The WakaTime endpoint accepts an `api_domain` parameter for WakaTime-compatible
self-hosted servers. It is validated as a plain public hostname:

- protocols, ports, paths and credentials are rejected,
- IP literals and `localhost` are rejected,
- anything invalid falls back to `wakatime.com` (or `WAKATIME_API_DOMAIN`).

Set `WAKATIME_API_DOMAIN` if you want a different default, and do not rely on
`api_domain` for untrusted deployments.

## HTTP hardening

The Express server sets:

- `X-Content-Type-Options: nosniff` — prevents browsers from interpreting SVGs
  as HTML/JS,
- `Referrer-Policy: no-referrer`,
- `X-Powered-By` disabled,
- JSON 404s for unknown API routes and a generic 500 handler that never leaks
  stack traces,
- timeouts on all outbound HTTP requests (`GITHUB_API_TIMEOUT_MS`).

Cards are served as `image/svg+xml`; the markup contains no scripts or external
references.

## Access control

| Variable         | Effect                                                  |
| ---------------- | ------------------------------------------------------- |
| `WHITELIST`      | If set, only these usernames can generate cards.        |
| `GIST_WHITELIST` | If set, only these gist IDs can generate cards.         |
| `EXCLUDE_REPO`   | Hides specific repositories from stars/language stats.  |

A blacklist of abusive accounts is maintained in `src/common/blacklist.js`.

## Denial of service considerations

- All network calls have timeouts.
- Rendering is bounded: `langs_count` is capped at 20, description lines at 3,
  and animations can be disabled.
- Add rate limiting at the edge (Vercel, CDN, nginx) for public instances. The
  built-in HTTP caching (`s-maxage`, `stale-while-revalidate`) already absorbs
  most repeat traffic.
- The in-memory cache is bounded by `MEMORY_CACHE_MAX_ENTRIES`.

## Dependencies

- `npm audit` and Dependabot alerts should be reviewed regularly.
- Dependencies are pinned with a lockfile (`package-lock.json`); use `npm ci` in
  deployments.
- The theme-automation scripts that required GitHub Actions were removed, which
  also removed six unused dependencies from the supply chain.

## Reporting a vulnerability

Please do **not** open a public issue for security problems. Follow the process
in [`SECURITY.md`](../SECURITY.md) and include reproduction steps, affected
endpoints/versions and any suggested fix.
