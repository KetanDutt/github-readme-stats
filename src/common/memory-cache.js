// @ts-check

/**
 * @file A small in-memory LRU cache with per-entry TTL support.
 *
 * The public deployment relies on CDN/browser caching, but self-hosted
 * instances (or local development without a CDN) hit the GitHub API on every
 * request. Caching the rendered SVG in memory removes almost all of that
 * latency and drastically lowers the number of GitHub API calls.
 */

/**
 * @typedef {object} MemoryCacheOptions
 * @property {number} [maxEntries=500] Maximum number of cached entries.
 * @property {number} [defaultTtlSeconds=300] Default entry TTL in seconds.
 * @property {() => number} [now] Clock function (injectable for tests).
 */

/**
 * @typedef {object} CacheStats
 * @property {number} entries Current number of entries.
 * @property {number} hits Number of cache hits.
 * @property {number} misses Number of cache misses.
 * @property {number} evictions Number of entries evicted because of the size limit.
 * @property {number} expirations Number of entries dropped because they expired.
 */

class MemoryCache {
  /**
   * Creates a new memory cache.
   *
   * @param {MemoryCacheOptions} [options] Cache options.
   */
  constructor({
    maxEntries = 500,
    defaultTtlSeconds = 300,
    now = () => Date.now(),
  } = {}) {
    /** @type {Map<string, { value: any, expiresAt: number }>} */
    this.entries = new Map();
    this.maxEntries = Math.max(1, maxEntries);
    this.defaultTtlSeconds = Math.max(1, defaultTtlSeconds);
    this.now = now;
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.expirations = 0;
  }

  /**
   * Reads a value from the cache.
   *
   * @param {string} key Cache key.
   * @returns {any | undefined} The cached value, or undefined when missing/expired.
   */
  get(key) {
    const entry = this.entries.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      this.expirations++;
      this.misses++;
      return undefined;
    }

    // Refresh the entry position so the least recently used entry is evicted
    // first.
    this.entries.delete(key);
    this.entries.set(key, entry);
    this.hits++;
    return entry.value;
  }

  /**
   * Writes a value to the cache.
   *
   * @param {string} key Cache key.
   * @param {any} value Value to cache.
   * @param {number} [ttlSeconds] Entry TTL in seconds.
   * @returns {void}
   */
  set(key, value, ttlSeconds = this.defaultTtlSeconds) {
    const ttl =
      Number.isFinite(ttlSeconds) && ttlSeconds > 0
        ? ttlSeconds
        : this.defaultTtlSeconds;

    // Delete first so that re-set keys move to the most recently used
    // position.
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + ttl * 1000 });

    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      this.entries.delete(oldestKey);
      this.evictions++;
    }
  }

  /**
   * Removes a single entry.
   *
   * @param {string} key Cache key.
   * @returns {boolean} Whether an entry was removed.
   */
  delete(key) {
    return this.entries.delete(key);
  }

  /**
   * Removes all entries.
   *
   * @returns {void}
   */
  clear() {
    this.entries.clear();
  }

  /**
   * Number of entries currently stored.
   *
   * @returns {number} Entry count.
   */
  get size() {
    return this.entries.size;
  }

  /**
   * Cache statistics.
   *
   * @returns {CacheStats} Cache stats.
   */
  get stats() {
    return {
      entries: this.entries.size,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      expirations: this.expirations,
    };
  }
}

/**
 * Extracts the `s-maxage` (or `max-age`) value from a Cache-Control header.
 *
 * @param {unknown} header Cache-Control header value.
 * @returns {number | undefined} TTL in seconds.
 */
const parseCacheControlTtl = (header) => {
  if (typeof header !== "string") {
    return undefined;
  }
  const match = /(?:s-maxage|max-age)=(\d+)/.exec(header);
  return match ? Number.parseInt(match[1], 10) : undefined;
};

/**
 * Creates an Express middleware that caches rendered SVG responses.
 *
 * Only successful `image/svg+xml` responses are cached. On a hit the original
 * `Content-Type` and `Cache-Control` headers are replayed so that the response
 * is indistinguishable from a freshly rendered card.
 *
 * @param {object} args Function arguments.
 * @param {MemoryCache} args.cache The cache instance.
 * @param {boolean} [args.enabled=true] Whether caching is enabled.
 * @param {(req: any) => boolean} [args.skip] Predicate for requests to skip.
 * @param {number} [args.defaultTtlSeconds=300] Fallback TTL.
 * @returns {(req: any, res: any, next: () => void) => void} Express middleware.
 */
const createSvgCacheMiddleware = ({
  cache,
  enabled = true,
  skip = () => false,
  defaultTtlSeconds = 300,
}) => {
  return (req, res, next) => {
    if (!enabled || req.method !== "GET" || skip(req)) {
      next();
      return;
    }

    const key = req.originalUrl || req.url;
    const cached = cache.get(key);

    if (cached) {
      if (cached.contentType) {
        res.setHeader("Content-Type", cached.contentType);
      }
      if (cached.cacheControl) {
        res.setHeader("Cache-Control", cached.cacheControl);
      }
      res.setHeader("X-Cache", "HIT");
      res.send(cached.body);
      return;
    }

    const originalSend = res.send.bind(res);

    res.send = (body) => {
      const contentType = res.getHeader("Content-Type");
      if (
        res.statusCode === 200 &&
        typeof body === "string" &&
        body.includes("<svg") &&
        typeof contentType === "string" &&
        contentType.includes("image/svg+xml")
      ) {
        cache.set(
          key,
          {
            body,
            contentType,
            cacheControl: res.getHeader("Cache-Control"),
          },
          parseCacheControlTtl(res.getHeader("Cache-Control")) ??
            defaultTtlSeconds,
        );
      }
      res.setHeader("X-Cache", "MISS");
      return originalSend(body);
    };

    next();
  };
};

export { MemoryCache, createSvgCacheMiddleware, parseCacheControlTtl };
