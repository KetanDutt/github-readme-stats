// @ts-check

import axios from "axios";
import { CustomError, MissingParamError } from "../common/error.js";
import { getNetworkOptions } from "../common/http.js";

const DEFAULT_API_DOMAIN = "wakatime.com";

/**
 * Normalizes the WakaTime API domain.
 *
 * The `api_domain` query parameter exists to support self-hosted WakaTime
 * compatible servers, but it must never let a caller point the server at an
 * arbitrary internal host (SSRF). Only plain public hostnames are accepted;
 * anything else falls back to `wakatime.com` (or the `WAKATIME_API_DOMAIN`
 * environment variable).
 *
 * @param {string | undefined} api_domain Domain provided by the caller.
 * @returns {string} A safe API domain.
 */
const sanitizeApiDomain = (api_domain) => {
  const fallback =
    process.env.WAKATIME_API_DOMAIN?.trim().toLowerCase() || DEFAULT_API_DOMAIN;

  if (!api_domain || typeof api_domain !== "string") {
    return fallback;
  }

  const cleaned = api_domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase();

  // Public hostnames only: no protocol, path, port, IP literal or localhost.
  return /^[a-z0-9][a-z0-9-]*(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(cleaned)
    ? cleaned
    : fallback;
};

/**
 * WakaTime data fetcher.
 *
 * @param {{username: string, api_domain?: string }} props Fetcher props.
 * @returns {Promise<import("./types").WakaTimeData>} WakaTime data response.
 */
const fetchWakatimeStats = async ({ username, api_domain }) => {
  if (!username) {
    throw new MissingParamError(["username"]);
  }

  const domain = sanitizeApiDomain(api_domain);

  try {
    const { data } = await axios.get(
      `https://${domain}/api/v1/users/${encodeURIComponent(
        username,
      )}/stats?is_including_today=true`,
      getNetworkOptions(),
    );

    if (!data || typeof data !== "object" || !data.data) {
      throw new CustomError(
        "Could not fetch WakaTime stats.",
        CustomError.WAKATIME_ERROR,
      );
    }

    return data.data;
  } catch (err) {
    const status = err?.response?.status;

    // WakaTime answers with 404 (and some proxies with 400) for unknown users.
    if (status === 400 || status === 404) {
      throw new CustomError(
        `Could not resolve to a User with the login of '${username}'`,
        CustomError.WAKATIME_USER_NOT_FOUND,
      );
    }

    // Network errors, timeouts and upstream 5xx responses.
    if (!status || status >= 500) {
      throw new CustomError(
        "Could not fetch WakaTime stats.",
        CustomError.WAKATIME_ERROR,
      );
    }

    throw err;
  }
};

export { fetchWakatimeStats, sanitizeApiDomain, DEFAULT_API_DOMAIN };
export default fetchWakatimeStats;
