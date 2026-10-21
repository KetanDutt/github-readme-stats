/**
 * @file Smoke tests for the bundled Express server.
 *
 * These tests boot the app on an ephemeral port and exercise the routing,
 * health probe and error handling without hitting the GitHub API.
 */
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import axios from "axios";
import { app } from "../express.js";

let server;
let baseUrl;

/**
 * Performs a GET request that never throws on HTTP error statuses.
 *
 * @param {string} path Request path.
 * @returns {Promise<import("axios").AxiosResponse>} The response.
 */
const get = (path) =>
  axios.get(`${baseUrl}${path}`, {
    validateStatus: () => true,
    // jsdom ships a browser XHR adapter; force the Node HTTP adapter.
    adapter: "http",
  });

beforeAll(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe("Test express server", () => {
  it("should expose a health probe", async () => {
    const res = await get("/health");

    expect(res.status).toBe(200);
    expect(res.data.status).toBe("ok");
    expect(res.data.version).toBeTruthy();
    expect(res.data).toHaveProperty("githubTokens");
    expect(res.data).toHaveProperty("memoryCache");
  });

  it("should render the landing page", async () => {
    const res = await get("/");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.data).toContain("GitHub <span>Readme</span> Stats");
    expect(res.data).toContain("/api/top-langs");
  });

  it("should set hardening headers", async () => {
    const res = await get("/health");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("should return a JSON 404 for unknown API routes", async () => {
    const res = await get("/api/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.data.error).toBe("Not found");
  });

  it("should return a text 404 for unknown pages", async () => {
    const res = await get("/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.data).toBe("Not found");
  });
});
