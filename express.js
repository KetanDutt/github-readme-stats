// @ts-check

/**
 * @file Local/self-hosted Express server.
 *
 * This server powers `npm start` and mirrors the Vercel serverless routing so
 * that the project can be deployed on any Node.js host (Docker, VPS, Render,
 * Railway, ...). See `docs/deployment.md` for deployment instructions.
 */

import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import compression from "compression";
import express from "express";
import gistCard from "./api/gist.js";
import statsCard from "./api/index.js";
import repoCard from "./api/pin.js";
import patInfo from "./api/status/pat-info.js";
import up from "./api/status/up.js";
import langCard from "./api/top-langs.js";
import wakatimeCard from "./api/wakatime.js";
import {
  MemoryCache,
  createSvgCacheMiddleware,
} from "./src/common/memory-cache.js";
import { renderLandingPage } from "./src/common/landing-page.js";
import { getPATs } from "./src/common/retryer.js";
import { themes } from "./themes/index.js";

// Load `.env` before reading any configuration below.
dotenv.config({ quiet: true });

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
);

// `npm start` runs in production mode (HTTP + memory caching enabled), while
// `npm run dev` passes `--dev` to enable development mode (caching disabled).
const isDevFlag = process.argv.includes("--dev");
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = isDevFlag ? "development" : "production";
}

const {
  PORT = "9000",
  NODE_ENV,
  MEMORY_CACHE,
  MEMORY_CACHE_MAX_ENTRIES = "500",
  MEMORY_CACHE_TTL_SECONDS = "300",
} = process.env;

const isProduction = NODE_ENV === "production";
const memoryCacheEnabled =
  MEMORY_CACHE !== "false" &&
  MEMORY_CACHE !== "0" &&
  NODE_ENV !== "development";

const cache = new MemoryCache({
  maxEntries: Number.parseInt(MEMORY_CACHE_MAX_ENTRIES, 10) || 500,
  defaultTtlSeconds: Number.parseInt(MEMORY_CACHE_TTL_SECONDS, 10) || 300,
});

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", true);

app.use(compression());

// Basic hardening headers. SVG responses are images, so they must never be
// sniffed as HTML/JS by browsers.
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

app.get("/health", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({
    status: "ok",
    version: packageJson.version,
    environment: NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    githubTokens: getPATs().length,
    memoryCache: memoryCacheEnabled ? cache.stats : { enabled: false },
  });
});

app.get("/", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.type("html").send(
    renderLandingPage({
      version: packageJson.version,
      hasTokens: getPATs().length > 0,
      themeCount: Object.keys(themes).length,
      cacheEnabled: memoryCacheEnabled,
      demoUsername: process.env.DEMO_USERNAME || "anuraghazra",
    }),
  );
});

const router = express.Router();

router.use(
  createSvgCacheMiddleware({
    cache,
    enabled: memoryCacheEnabled,
    defaultTtlSeconds: Number.parseInt(MEMORY_CACHE_TTL_SECONDS, 10) || 300,
  }),
);

router.get("/", statsCard);
router.get("/pin", repoCard);
router.get("/top-langs", langCard);
router.get("/wakatime", wakatimeCard);
router.get("/gist", gistCard);
router.get("/status/up", up);
router.get("/status/pat-info", patInfo);

app.use("/api", router);

// JSON 404 for API routes, plain text for everything else.
app.use((req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.path.startsWith("/api")) {
    res.status(404).json({ error: "Not found", path: req.path });
    return;
  }
  res.status(404).type("text").send("Not found");
});

// Last-resort error handler: never leak stack traces to clients.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const message = err instanceof Error ? err.message : "Unknown error";
  console.error(`[error] ${message}`);
  if (res.headersSent) {
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.status(500).json({ error: "Internal server error" });
});

const port = Number.parseInt(PORT, 10) || 9000;

/**
 * Whether this module was started directly (`node express.js`) instead of
 * being imported (e.g. by tests).
 *
 * @returns {boolean} True when the module is the process entry point.
 */
const isMainModule = () => {
  const entry = process.argv[1];
  return Boolean(entry) && import.meta.url === pathToFileURL(entry).href;
};

if (isMainModule()) {
  const server = app.listen(port, "0.0.0.0", () => {
    const tokens = getPATs().length;
    console.log(
      `github-readme-stats v${packageJson.version} listening on http://0.0.0.0:${port} ` +
        `(${isProduction ? "production" : "development"}, ${tokens} GitHub token${
          tokens === 1 ? "" : "s"
        }, memory cache ${memoryCacheEnabled ? "on" : "off"})`,
    );
  });

  /**
   * Closes the HTTP server, allowing process managers to restart it cleanly.
   *
   * @param {string} signal The received signal name.
   * @returns {void}
   */
  const shutdown = (signal) => {
    console.log(`Received ${signal}, shutting down...`);
    server.close(() => process.exit(0));
    // Force-exit if open keep-alive connections keep the server alive.
    setTimeout(() => process.exit(0), 5000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

export { app, cache };
export default app;
