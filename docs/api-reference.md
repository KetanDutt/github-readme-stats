# API reference

All card endpoints return `image/svg+xml`. Status endpoints return JSON. Every
endpoint is available both on the public Vercel deployment and on a self-hosted
instance — replace the host in the examples below.

| Endpoint                  | Returns | Description                          |
| ------------------------- | ------- | ------------------------------------ |
| `GET /api`                | SVG     | GitHub stats card                    |
| `GET /api/pin`            | SVG     | Repository pin card                  |
| `GET /api/top-langs`      | SVG     | Most used languages card             |
| `GET /api/gist`           | SVG     | Gist pin card                        |
| `GET /api/wakatime`       | SVG     | WakaTime coding activity card        |
| `GET /api/status/up`      | JSON    | Whether the configured tokens work   |
| `GET /api/status/pat-info`| JSON    | Detailed token health report         |
| `GET /health`             | JSON    | Instance health probe (self-hosted)  |

## Common parameters

These parameters are accepted by all card endpoints unless stated otherwise.

| Parameter         | Type    | Default     | Description                                                                                   |
| ----------------- | ------- | ----------- | --------------------------------------------------------------------------------------------- |
| `title_color`     | hex     | theme       | Card title color (without `#`).                                                               |
| `text_color`      | hex     | theme       | Body text color.                                                                              |
| `icon_color`      | hex     | theme       | Icon color (stats, repo, gist and WakaTime cards).                                            |
| `bg_color`        | hex     | theme       | Background color. Supports gradients: `angle,color1,color2[,color3...]`.                      |
| `border_color`    | hex     | theme       | Card border color.                                                                            |
| `theme`           | string  | `default`   | Name of a built-in theme. Unknown themes fall back to `default`. See [themes](../themes/README.md). |
| `hide_border`     | boolean | `false`     | Hides the card border.                                                                        |
| `border_radius`   | number  | `4.5`       | Corner radius of the card.                                                                    |
| `locale`          | string  | `en`        | UI language. See [available locales](../readme.md#available-locales).                          |
| `cache_seconds`   | number  | per card    | Requested cache TTL. Clamped to the per-card allowed range (see [caching](#caching)).           |
| `disable_animations` | boolean | `false` | Disables the CSS animations.                                                                  |

Valid booleans are `true` and `false` (case-insensitive). Any other value is
treated as "not set".

### Caching

Responses are sent with `Cache-Control: max-age=…, s-maxage=…,
stale-while-revalidate=86400`. The allowed range of `cache_seconds` depends on
the card:

| Card           | Default | Minimum | Maximum |
| -------------- | ------- | ------- | ------- |
| Stats          | 1 day   | 12 h    | 2 days  |
| Top languages  | 6 days  | 2 days  | 10 days |
| Pin            | 10 days | 1 day   | 10 days |
| Gist           | 2 days  | 1 day   | 10 days |
| WakaTime       | 1 day   | 12 h    | 2 days  |

Error responses are cached for 10 minutes. Setting `cache_seconds=0` disables
HTTP caching. The `CACHE_SECONDS` environment variable overrides the default for
all cards on a self-hosted instance.

## `GET /api` — GitHub Stats Card

| Parameter             | Type    | Default        | Description                                                                                 |
| --------------------- | ------- | -------------- | ------------------------------------------------------------------------------------------- |
| `username`            | string  | **required**   | GitHub username.                                                                            |
| `hide`                | list    | –              | Comma-separated stats to hide: `stars`, `commits`, `prs`, `issues`, `contribs`.              |
| `show`                | list    | –              | Extra stats to show: `reviews`, `prs_merged`, `prs_merged_percentage`, `discussions_started`, `discussions_answered`. |
| `show_icons`          | boolean | `false`        | Shows icons next to the labels.                                                              |
| `hide_title`          | boolean | `false`        | Hides the card title.                                                                        |
| `hide_rank`           | boolean | `false`        | Hides the rank circle.                                                                       |
| `rank_icon`           | enum    | `default`      | `default` (letter grade), `github` (logo) or `percentile` (top-N percentage).                 |
| `include_all_commits` | boolean | `false`        | Counts all commits via the GitHub REST API instead of the current year.                      |
| `commits_year`        | number  | current year   | Counts commits for a specific year (`2008` – current year).                                  |
| `line_height`         | number  | `25`           | Vertical spacing between stat rows.                                                          |
| `card_width`          | number  | `450`/`287`    | Card width in pixels; automatically increased to fit the content.                            |
| `custom_title`        | string  | –              | Replaces the card title.                                                                     |
| `text_bold`           | boolean | `true`         | Uses bold text for stat values.                                                              |
| `number_format`       | enum    | `short`        | `short` (`1.2k`) or `long` (`1200`).                                                         |
| `number_precision`    | number  | `2`            | Decimal places for abbreviated numbers (`0`–`2`).                                            |
| `ring_color`          | hex     | title color    | Rank ring color.                                                                             |
| `exclude_repo`        | list    | –              | Comma-separated repository names excluded from the star count.                               |

```md
![GitHub Stats](https://your-instance.example.com/api?username=anuraghazra&show_icons=true&show=reviews,prs_merged&rank_icon=github)
```

## `GET /api/pin` — Repository Pin Card

| Parameter                | Type    | Default       | Description                                            |
| ------------------------ | ------- | ------------- | ------------------------------------------------------ |
| `username`               | string  | **required**  | Repository owner (user or organization).               |
| `repo`                   | string  | **required**  | Repository name.                                       |
| `show_owner`             | boolean | `false`       | Prefixes the repository name with its owner.           |
| `description_lines_count`| number  | auto          | Number of description lines to reserve (`1`–`3`).       |

```md
![Repo Card](https://your-instance.example.com/api/pin?username=anuraghazra&repo=github-readme-stats)
```

## `GET /api/top-langs` — Top Languages Card

| Parameter        | Type    | Default      | Description                                                                                     |
| ---------------- | ------- | ------------ | ----------------------------------------------------------------------------------------------- |
| `username`       | string  | **required** | GitHub username.                                                                                |
| `layout`         | enum    | `normal`     | `normal`, `compact`, `donut`, `donut-vertical` or `pie`.                                         |
| `langs_count`    | number  | per layout   | Number of languages to display (`1`–`20`). Defaults: 5 (normal/donut), 6 (compact/pie/donut-vertical). |
| `hide`           | list    | –            | Comma-separated language names to hide (case-insensitive).                                       |
| `hide_title`     | boolean | `false`      | Hides the card title.                                                                            |
| `hide_progress`  | boolean | `false`      | Hides the progress bars (implies the compact layout).                                            |
| `card_width`     | number  | `300`        | Card width; values below `280` are raised to `280`.                                              |
| `exclude_repo`   | list    | –            | Comma-separated repository names excluded from the calculation.                                  |
| `size_weight`    | number  | `1`          | Weight applied to the language size. Must be `>= 0`.                                             |
| `count_weight`   | number  | `0`          | Weight applied to the number of repositories using a language. Must be `>= 0`.                    |
| `custom_title`   | string  | –            | Replaces the card title.                                                                         |
| `stats_format`   | enum    | `percentages`| `percentages` or `bytes`.                                                                        |

```md
![Top Languages](https://your-instance.example.com/api/top-langs?username=anuraghazra&layout=donut&langs_count=8)
```

## `GET /api/gist` — Gist Pin Card

| Parameter    | Type    | Default      | Description                               |
| ------------ | ------- | ------------ | ----------------------------------------- |
| `id`         | string  | **required** | Gist ID.                                  |
| `show_owner` | boolean | `false`      | Prefixes the file name with its owner.    |

```md
![Gist Card](https://your-instance.example.com/api/gist?id=bbfce31e0217a3689c8d961a356cb10d)
```

## `GET /api/wakatime` — WakaTime Card

| Parameter        | Type    | Default      | Description                                                                 |
| ---------------- | ------- | ------------ | --------------------------------------------------------------------------- |
| `username`       | string  | **required** | WakaTime username (profile must be public).                                 |
| `layout`         | enum    | `normal`     | `normal` or `compact`.                                                       |
| `langs_count`    | number  | all          | Number of languages to display.                                              |
| `hide`           | list    | –            | Comma-separated language names to hide.                                      |
| `hide_title`     | boolean | `false`      | Hides the card title.                                                        |
| `hide_progress`  | boolean | `false`      | Hides the progress bars.                                                     |
| `line_height`    | number  | `25`         | Vertical spacing between rows.                                               |
| `card_width`     | number  | `495`        | Card width (minimum `250`, or `400` for the compact layout).                  |
| `display_format` | enum    | `time`       | `time` (`2 hrs 30 mins`) or `percent` (`42.42 %`).                            |
| `api_domain`     | string  | `wakatime.com` | Hostname of a WakaTime-compatible server (e.g. Wakapi). Public hostnames only. |
| `custom_title`   | string  | –            | Replaces the card title.                                                     |

```md
![WakaTime Card](https://your-instance.example.com/api/wakatime?username=anuraghazra&layout=compact)
```

## Status endpoints

### `GET /api/status/up`

Reports whether at least one configured token can reach the GitHub API.

| Query  | Values              | Description                                    |
| ------ | ------------------- | ---------------------------------------------- |
| `type` | `boolean`, `json`, `shields` | Response format. Defaults to `boolean`. |

```jsonc
// /api/status/up?type=json
{ "up": true }
```

`type=shields` returns a [shields.io endpoint](https://shields.io/endpoint)
payload and can be used as a dynamic badge. The result is cached for 5 minutes
when the instance is healthy and is never cached when it is not.

### `GET /api/status/pat-info`

Returns a report of every configured token (`PAT_1`, `PAT_2`, ...), grouped by
status: `validPATs`, `expiredPATs`, `exhaustedPATs`, `suspendedPATs`,
`errorPATs`, plus a `details` object with the remaining quota or reset time.
Like `/api/status/up`, successful responses are cached for 5 minutes.

### `GET /health` (self-hosted server only)

```json
{
  "status": "ok",
  "version": "1.1.0",
  "environment": "production",
  "uptimeSeconds": 132,
  "timestamp": "2026-01-01T00:00:00.000Z",
  "githubTokens": 2,
  "memoryCache": { "entries": 12, "hits": 34, "misses": 5, "evictions": 0, "expirations": 1 }
}
```

Use it for container/orchestrator health checks. It never calls the GitHub API.

## Error cards

Invalid input never produces a stack trace. Instead, the API returns an SVG
error card with a short explanation. Common cases:

| Message                                        | Cause                                                         |
| ---------------------------------------------- | ------------------------------------------------------------- |
| `Missing params "username" ...`                 | A required query parameter is missing.                        |
| `Locale not found`                              | `locale` is not one of the supported locales.                 |
| `Incorrect layout input`                        | `layout` is not valid for the requested card.                 |
| `Incorrect stats_format input`                  | `stats_format` is not `percentages` or `bytes`.               |
| `Incorrect display_format input`                | `display_format` is not `time` or `percent`.                  |
| `Incorrect size_weight or count_weight input`   | A weight is negative.                                         |
| `Incorrect commits_year input ...`              | `commits_year` is outside `2008`–current year.                |
| `Could not resolve to a User with the login of …` | The user does not exist (or is an organization).            |
| `Not found` / `User Repository Not found`       | The repository does not exist or is private.                  |
| `No GitHub API tokens found`                    | No `PAT_*` environment variable is configured.                |
| `Downtime due to GitHub API rate limiting`      | All tokens are rate limited or invalid.                       |

See [Troubleshooting](./troubleshooting.md) for fixes.
