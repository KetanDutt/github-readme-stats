# Deployment

GitHub Readme Stats can run as:

1. a **Vercel** project (the original deployment model), or
2. a **long-running Node.js server** using the bundled Express app (Docker, VPS,
   Render, Railway, Fly.io, Kubernetes, ...).

Both use the same `api/*.js` handlers and renderer.

> [!IMPORTANT]
> This repository intentionally contains **no CI and no GitHub Actions
> workflows**. Deployments are triggered manually or by your hosting provider's
> Git integration.

## 1. Deploy on Vercel

### Dashboard (recommended)

1. Fork this repository.
2. In Vercel, choose **Add New → Project** and import your fork.
3. Add the environment variables from [Configuration](./configuration.md),
   starting with `PAT_1`.
4. Deploy. Cards are served from `https://<project>.vercel.app/api`.

`vercel.json` configures 128 MB of memory and a 10 second `maxDuration` for the
API functions. The root path redirects to the upstream repository; change the
redirect if you want a custom landing page.

### CLI

```bash
npm i -g vercel
vercel login
vercel          # first deployment, links the project
vercel --prod   # production deployment
```

Remember to redeploy after changing environment variables — existing deployments
keep the old values.

## 2. Deploy with Docker

A production-ready [`Dockerfile`](../Dockerfile) is included.

```bash
docker build -t github-readme-stats .
docker run --rm -p 9000:9000 \
  -e PAT_1=ghp_xxx \
  -e NODE_ENV=production \
  github-readme-stats
```

Or with Docker Compose:

```bash
cp .env.example .env   # set PAT_1
docker compose up -d
```

The container:

- runs as the unprivileged `node` user,
- installs only production dependencies,
- exposes a `HEALTHCHECK` against `/health`,
- handles `SIGTERM`/`SIGINT` for zero-downtime restarts.

## 3. Deploy on a VPS / PaaS with Node.js

Requirements: **Node.js 22 or newer** (see `.nvmrc`).

```bash
npm ci --omit=dev
PAT_1=ghp_xxx NODE_ENV=production npm start
```

`npm start` starts `express.js`, which:

- serves `/` (dashboard), `/health` and every `/api/*` endpoint,
- compresses responses with gzip/brotli negotiation,
- sets `X-Content-Type-Options: nosniff` and disables `X-Powered-By`,
- keeps an in-memory SVG cache (see [Performance](./performance.md)),
- returns JSON 404s for unknown API routes.

Use a process manager (systemd, pm2, supervisord) to keep it alive and put a TLS
terminating proxy (Caddy, nginx, Traefik) in front of it. Example systemd unit:

```ini
[Unit]
Description=GitHub Readme Stats
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/github-readme-stats
EnvironmentFile=/opt/github-readme-stats/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/node express.js
Restart=always
RestartSec=5
User=www-data

[Install]
WantedBy=multi-user.target
```

## Deployment checklist

- [ ] At least one `PAT_*` token configured (use several for higher rate limits).
- [ ] `NODE_ENV=production` so caching is enabled.
- [ ] A CDN or reverse proxy in front of the instance for `s-maxage` caching.
- [ ] `/health` wired to your platform's health check.
- [ ] Logs collected (the server logs startup configuration and errors).
- [ ] `CACHE_SECONDS` tuned to your traffic (see [Configuration](./configuration.md)).
- [ ] Whitelist configured if the instance is personal/private.
- [ ] Dependencies updated (`npm audit`, `npm outdated`).
- [ ] Backups are unnecessary — the app is stateless apart from the in-memory cache.

## Platform notes

| Platform        | Notes                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| Vercel          | Use the serverless functions in `api/`; no Express server is started. `vercel.json` sets memory/time limits.   |
| Docker          | Use port `9000` (or `PORT`); set `NODE_ENV=production`.                                                        |
| Render/Railway  | Start command `npm start`, health check path `/health`.                                                        |
| Fly.io          | Add an `http_service` on the `PORT` you configure; `/health` works as a check.                                 |
| Kubernetes      | Use `/health` for liveness/readiness; set memory limits around 128–256 MiB.                                    |

## Updating a deployment

```bash
git pull                 # or sync your fork
npm ci --omit=dev
npm test                 # optional but recommended
npm start                # restart the service/container afterwards
```

For Vercel, push the changes or run `vercel --prod`.
