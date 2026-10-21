# Documentation

Welcome to the documentation for **GitHub Readme Stats**. These documents cover
everything from embedding a card in your profile README to running your own
production instance.

## Contents

| Document                                       | What it covers                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| [API reference](./api-reference.md)            | Every endpoint, every query parameter, defaults, limits and error messages.     |
| [Configuration](./configuration.md)            | Environment variables, themes, locales and caching semantics.                  |
| [Deployment](./deployment.md)                  | Vercel, Docker, bare Node.js/Express, health checks and production checklist.    |
| [Architecture](./architecture.md)              | How a request flows through the project, module layout and extension guides.    |
| [Development](./development.md)                | Local setup, npm scripts, tests, snapshots, linting, formatting and benchmarks.  |
| [Performance](./performance.md)                | Caching layers, keep-alive, compression and tuning the in-memory cache.          |
| [Security](./security.md)                      | Token handling, input validation, SSRF protections and responsible disclosure.  |
| [Troubleshooting](./troubleshooting.md)        | Fixing the most common errors shown on cards or in logs.                        |

## Quick start

### Use the public instance

```md
![GitHub Stats](https://github-readme-stats.vercel.app/api?username=anuraghazra&show_icons=true)
```

> [!WARNING]
> The public instance is best-effort and subject to GitHub API rate limits. For
> reliable cards, self-host an instance (see [Deployment](./deployment.md)).

### Run your own instance

```bash
npm install
cp .env.example .env       # add at least PAT_1
npm start                  # http://localhost:9000
```

Open `http://localhost:9000` for a live dashboard with example cards, and
`http://localhost:9000/health` for a machine-readable health probe.

### Embed a card

Replace the host with your own instance:

```md
![GitHub Stats](https://your-instance.example.com/api?username=your-username)
![Top Languages](https://your-instance.example.com/api/top-langs?username=your-username)
```

## Project layout

```
.
├── api/                  # Serverless handlers (one file per endpoint)
│   └── status/           # Uptime and token health endpoints
├── docs/                 # This documentation
├── scripts/              # Maintenance scripts (theme docs, language colors)
├── src/
│   ├── cards/            # SVG renderers (stats, repo, gist, languages, WakaTime)
│   ├── common/           # Shared infrastructure (Card, cache, colors, HTTP, ...)
│   └── fetchers/         # GitHub / WakaTime API clients
├── tests/                # Jest unit, API, snapshot and benchmark suites
├── themes/               # Built-in themes and generated theme gallery
├── express.js            # Self-hosted Express server
└── vercel.json           # Vercel serverless configuration
```

See [Architecture](./architecture.md) for a deeper tour.

## Project policies

- **No CI and no GitHub Actions workflows.** All checks run locally. See
  [CONTRIBUTING.md](../CONTRIBUTING.md#no-ci-and-no-github-actions-project-policy).
- **No new themes.** Theme additions are paused; use
  [customization options](../readme.md#customization) instead.
- **Localization is welcome.** Add new locales to
  [`src/translations.js`](../src/translations.js); see
  [CONTRIBUTING.md](../CONTRIBUTING.md#translations-contribution).
