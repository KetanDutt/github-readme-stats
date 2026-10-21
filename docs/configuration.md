# Configuration

Every option is provided through environment variables. Local development reads
them from a `.env` file (see [`.env.example`](../.env.example)); on Vercel and
most PaaS providers you configure them in the dashboard.

## GitHub tokens

| Variable          | Required | Description                                                        |
| ----------------- | -------- | ------------------------------------------------------------------ |
| `PAT_1` … `PAT_N` | Yes      | One or more GitHub personal access tokens (classic or fine-grained). |

- Tokens are tried in numeric order. When a token is rate limited, invalid or
  suspended, the next one is used automatically.
- Only the **public** scopes are needed for the stats cards. For private
  contributions, use a token with `repo` access on the instance you trust.
- Token values never leave the server. Responses never include the token
  itself; `/api/status/pat-info` only reports the variable **names** and their
  status.
- Non-contiguous names (`PAT_1`, `PAT_5`) are supported.

Generate a token at <https://github.com/settings/tokens>. Classic tokens with no
scopes are enough for public data.

## Behaviour

| Variable                 | Default        | Description                                                                                                   |
| ------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------- |
| `CACHE_SECONDS`          | per-card       | Forces the HTTP cache TTL (seconds) for **all** cards. `0` disables caching. Overrides `cache_seconds`.        |
| `WHITELIST`              | unset          | Comma-separated usernames allowed to use the instance. Unset means everyone.                                   |
| `GIST_WHITELIST`         | unset          | Comma-separated gist IDs allowed to use the instance.                                                          |
| `EXCLUDE_REPO`           | unset          | Comma-separated repositories excluded from stars and language calculations for every request.                  |
| `FETCH_MULTI_PAGE_STARS` | `false`        | Fetch every starred repository page (accurate star totals for accounts with >100 repos, more API quota).       |
| `WAKATIME_API_DOMAIN`    | `wakatime.com` | Default hostname for the WakaTime API (e.g. `wakapi.example.com`). Can be overridden per request via `api_domain`. |
| `GITHUB_API_TIMEOUT_MS`  | `10000`        | Timeout for outbound GitHub/WakaTime requests. Lower it on strict serverless platforms.                        |

### Self-hosted server only

| Variable                   | Default      | Description                                                                                      |
| -------------------------- | ------------ | ------------------------------------------------------------------------------------------------ |
| `PORT`                     | `9000`       | HTTP port of the bundled Express server.                                                         |
| `NODE_ENV`                 | `production` | `production` enables HTTP and memory caching; `development` disables them.                        |
| `MEMORY_CACHE`             | enabled      | Set to `false`/`0` to disable the in-memory SVG cache.                                            |
| `MEMORY_CACHE_MAX_ENTRIES` | `500`        | Maximum number of rendered cards kept in memory.                                                 |
| `MEMORY_CACHE_TTL_SECONDS` | `300`        | Fallback TTL when a response has no `Cache-Control` header.                                      |
| `DEMO_USERNAME`            | `anuraghazra`| Username used for the live previews on the landing page.                                         |

> [!NOTE]
> The in-memory cache is **per process**. If you run several instances behind a
> load balancer, each instance warms its own cache. When `NODE_ENV` is
> `development`, the cache and HTTP caching are disabled so you always see fresh
> data.

## Themes

Themes are plain color sets defined in [`themes/index.js`](../themes/index.js).
Use `?theme=THEME_NAME`; the full gallery with previews lives in
[`themes/README.md`](../themes/README.md). Unknown theme names fall back to the
default theme instead of failing.

Custom colors always take precedence over the theme:

```
?theme=dark&title_color=ff0000&bg_color=35,4158d0,c850c0,ffcc70
```

The `bg_color` gradient syntax is `angle,color1,color2[,color3…]`; at least two
colors are required.

## Locales

Card text is localized through [`src/translations.js`](../src/translations.js).
Use `?locale=xx`; unknown locales return an error card. The list of supported
locales is maintained in the readme under
[available locales](../readme.md#available-locales).

To add a locale, add the language code to every translation object and to the
`availableLocales` array, then run the tests (they verify that every locale has
every key).

## Scripts-only variables

| Variable       | Used by                         | Description                                     |
| -------------- | ------------------------------- | ----------------------------------------------- |
| `GITHUB_TOKEN` | `npm run theme-readme-gen`      | Token for scripts that talk to GitHub (optional).|

## Example `.env`

```dotenv
# Required
PAT_1=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional
CACHE_SECONDS=86400
EXCLUDE_REPO=my-private-repo
WHITELIST=my-username,another-user
PORT=9000
MEMORY_CACHE_MAX_ENTRIES=1000
```
