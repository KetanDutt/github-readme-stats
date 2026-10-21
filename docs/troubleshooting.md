# Troubleshooting

Most problems appear either as an **error card** (the small SVG with "Something
went wrong!") or in the server logs. This page maps each message to a fix.

## Error card messages

| Message on the card                              | Meaning & fix                                                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `Missing params "username"`                      | The URL has no `username`. Add `?username=your-name`.                                                                          |
| `Missing params "repo"` / `"id"`                  | `/api/pin` needs `repo`, `/api/gist` needs `id`.                                                                                |
| `No GitHub API tokens found`                      | No `PAT_*` variable is visible. Add `PAT_1` to `.env` (self-hosted) or the Vercel dashboard and redeploy.                       |
| `Downtime due to GitHub API rate limiting`        | Every token is rate limited, expired or suspended. Wait for the reset, add more `PAT_*` tokens, or raise the cache TTL.         |
| `Could not resolve to a User with the login of …` | The username does not exist, was renamed, or is an **organization** (stats cards support users only).                          |
| `Not found`                                       | For `/api/pin`: the owner or repository does not exist.                                                                        |
| `User Repository Not found`                       | The repository is private, and the token has no access to it.                                                                   |
| `Organization Repository Not found`               | Same as above for an organization-owned repository.                                                                             |
| `Gist not found`                                  | The gist ID is wrong or the gist is secret (secret gists are only visible to their owner token).                                |
| `Could not resolve to a User with the login of '…'` (WakaTime) | The WakaTime profile is private or does not exist. Make it public.                                                  |
| `Could not fetch WakaTime stats.`                 | WakaTime is unreachable or returned a 5xx. Retry later.                                                                          |
| `Could not fetch total commits.`                  | The GitHub search API failed. Retry; if persistent, check token scopes.                                                         |
| `Locale not found`                                | `locale` is not supported. Check [available locales](../readme.md#available-locales).                                           |
| `Incorrect layout input`                          | Allowed values: stats `default`; top-langs `normal/compact/donut/donut-vertical/pie`; WakaTime `normal/compact`.                 |
| `Incorrect stats_format input`                    | Use `percentages` or `bytes`.                                                                                                   |
| `Incorrect display_format input`                  | Use `time` or `percent`.                                                                                                        |
| `Incorrect size_weight or count_weight input`     | Weights must be numbers `>= 0`.                                                                                                 |
| `Incorrect commits_year input …`                  | Use a year between `2008` and the current year.                                                                                 |
| `Could not render stats card.`                    | Every stat is hidden (`hide=...`) **and** `hide_rank=true`. Show at least one item.                                             |

## The card does not update

Cards are cached aggressively on purpose:

1. GitHub Camo (the image proxy used by GitHub) caches images.
2. Your browser and any CDN cache them per `Cache-Control`.
3. The self-hosted server keeps rendered cards in memory.

To force a refresh:

- Append `&cache_seconds=0` to the URL (bypasses HTTP caching; the memory cache
  is bypassed too because the response has no TTL).
- Wait for the TTL shown in the response headers (`curl -I <url>`).
- In development, run with `NODE_ENV=development` or `MEMORY_CACHE=false`.

## Rate limits

- Each token gets 5,000 GraphQL points/hour (public data).
- `include_all_commits=true` and `FETCH_MULTI_PAGE_STARS=true` consume more.
- Add more tokens (`PAT_1`, `PAT_2`, …) — they are rotated automatically.
- Increase `cache_seconds` and put a CDN in front of the instance.

Check the current state:

```bash
curl -s http://localhost:9000/api/status/pat-info | jq
curl -s "http://localhost:9000/api/status/up?type=json"
```

## Private repositories and commits

- Stars and languages only include data the token can see. To include private
  repositories, use a token with access to them on your **own** instance.
- "All commits" can only count public commits of your default branch history;
  private contribution counts are not exposed by the GitHub API.
- Organizations are not supported by `/api` or `/api/top-langs` (the GraphQL
  query targets a user).

## Languages card looks wrong

- Language percentages are computed from repository byte sizes, not lines of
  code. Vendored files, generated code and notebooks can dominate.
- Use `exclude_repo`, `hide=...`, or the `size_weight` / `count_weight`
  parameters to adjust the ranking. See
  [the readme](../readme.md#language-stats-algorithm).
- Only the 100 most recently updated owned, non-forked repositories are
  considered.

## Self-hosted server issues

| Symptom                              | Fix                                                                                                       |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `EADDRINUSE` on start                | Another process uses `PORT`. Set `PORT=9000` (or another free port).                                       |
| Every card says "No tokens"          | `.env` is missing or was not loaded. `npm start` loads `.env` from the working directory.                   |
| Cache seems stuck on                  | Development mode disables caching, production enables it. Check `NODE_ENV` in `/health`.                    |
| Container exits immediately          | Run `docker run … node express.js` manually to see the error; ensure `PAT_1` is passed.                     |
| 502 behind nginx                      | The app binds `0.0.0.0`; check the upstream port and `proxy_pass`.                                         |

## Tests or lint failing locally

```bash
npm ci                 # reinstall exactly the locked dependencies
npm test               # unit + API tests
npm run lint
npm run format:check
```

If only a snapshot fails, inspect the diff before running
`npm run test:update:snapshot`. An unexpected snapshot change is usually a
regression in layout or escaping.

## Getting help

- Search the [issues](https://github.com/anuraghazra/github-readme-stats/issues)
  and [discussions](https://github.com/anuraghazra/github-readme-stats/discussions).
- When reporting a bug, include the full request URL, the rendered card (or its
  message), server logs and your environment (`node -v`, deployment platform).
- Never paste token values — redact them before sharing logs.
