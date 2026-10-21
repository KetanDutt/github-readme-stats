import { describe, expect, it, jest } from "@jest/globals";
import {
  MemoryCache,
  createSvgCacheMiddleware,
  parseCacheControlTtl,
} from "../src/common/memory-cache.js";

describe("Test memory-cache.js", () => {
  it("should store and retrieve values", () => {
    const cache = new MemoryCache();

    expect(cache.get("missing")).toBe(undefined);
    cache.set("key", "value");

    expect(cache.get("key")).toBe("value");
    expect(cache.size).toBe(1);
    expect(cache.stats).toMatchObject({ hits: 1, misses: 1, entries: 1 });
  });

  it("should expire entries based on their TTL", () => {
    let now = 0;
    const cache = new MemoryCache({ now: () => now });

    cache.set("key", "value", 60);
    expect(cache.get("key")).toBe("value");

    now = 60_000;
    expect(cache.get("key")).toBe(undefined);
    expect(cache.stats.expirations).toBe(1);
  });

  it("should evict the least recently used entry", () => {
    const cache = new MemoryCache({ maxEntries: 2 });

    cache.set("a", 1);
    cache.set("b", 2);
    // Touch `a` so `b` becomes the least recently used entry.
    expect(cache.get("a")).toBe(1);
    cache.set("c", 3);

    expect(cache.get("b")).toBe(undefined);
    expect(cache.get("a")).toBe(1);
    expect(cache.get("c")).toBe(3);
    expect(cache.stats.evictions).toBe(1);
  });

  it("should support delete and clear", () => {
    const cache = new MemoryCache();

    cache.set("a", 1);
    cache.set("b", 2);

    expect(cache.delete("a")).toBe(true);
    expect(cache.delete("a")).toBe(false);

    cache.clear();
    expect(cache.size).toBe(0);
  });

  it("should parse Cache-Control TTLs", () => {
    expect(parseCacheControlTtl("max-age=60, s-maxage=120")).toBe(60);
    expect(
      parseCacheControlTtl("s-maxage=86400, stale-while-revalidate=60"),
    ).toBe(86400);
    expect(parseCacheControlTtl("no-store")).toBe(undefined);
    expect(parseCacheControlTtl(undefined)).toBe(undefined);
  });

  it("should cache SVG responses and replay headers on a hit", () => {
    const cache = new MemoryCache();
    const middleware = createSvgCacheMiddleware({ cache });

    const headers = {};
    const send = jest.fn();
    const res = {
      statusCode: 200,
      setHeader: jest.fn((key, value) => {
        headers[key] = value;
      }),
      getHeader: jest.fn((key) => headers[key]),
      send,
    };

    const next = jest.fn();
    middleware({ method: "GET", url: "/api?username=x" }, res, next);

    expect(next).toHaveBeenCalled();

    // Simulate the route handler setting headers and sending the card.
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "max-age=60, s-maxage=60");
    res.send("<svg>card</svg>");

    expect(res.setHeader).toHaveBeenCalledWith("X-Cache", "MISS");

    expect(send).toHaveBeenCalledWith("<svg>card</svg>");
    expect(cache.size).toBe(1);

    // Second request is served from the cache without calling `next`.
    const hitHeaders = {};
    const hitSend = jest.fn();
    const hitRes = {
      statusCode: 200,
      setHeader: jest.fn((key, value) => {
        hitHeaders[key] = value;
      }),
      getHeader: jest.fn((key) => hitHeaders[key]),
      send: hitSend,
    };
    const hitNext = jest.fn();

    middleware({ method: "GET", url: "/api?username=x" }, hitRes, hitNext);

    expect(hitNext).not.toHaveBeenCalled();
    expect(hitSend).toHaveBeenCalledWith("<svg>card</svg>");
    expect(hitHeaders["Content-Type"]).toBe("image/svg+xml");
    expect(hitHeaders["Cache-Control"]).toBe("max-age=60, s-maxage=60");
    expect(hitHeaders["X-Cache"]).toBe("HIT");
  });

  it("should not cache non-SVG responses", () => {
    const cache = new MemoryCache({ defaultTtlSeconds: 60 });
    const middleware = createSvgCacheMiddleware({ cache });

    const headers = { "Content-Type": "application/json" };
    const res = {
      statusCode: 200,
      setHeader: jest.fn(),
      getHeader: jest.fn((key) => headers[key]),
      send: jest.fn(),
    };
    const next = jest.fn();

    middleware({ method: "GET", url: "/api/status/up" }, res, next);
    res.send('{"up":true}');

    expect(cache.size).toBe(0);
  });

  it("should bypass the cache when disabled", () => {
    const cache = new MemoryCache();
    const middleware = createSvgCacheMiddleware({ cache, enabled: false });

    const res = {
      setHeader: jest.fn(),
      getHeader: jest.fn(),
      send: jest.fn(),
    };
    const next = jest.fn();

    middleware({ method: "GET", url: "/api?username=x" }, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.setHeader).not.toHaveBeenCalled();
  });
});
