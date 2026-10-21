// @ts-check

import axios from "axios";
import http from "node:http";
import https from "node:https";

const GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

/**
 * Default request timeout in milliseconds. GitHub usually answers in a few
 * hundred milliseconds; without a timeout a stalled upstream request would
 * keep a serverless invocation alive until the platform kills it.
 */
const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Parses the `GITHUB_API_TIMEOUT_MS` environment variable.
 *
 * @param {string | undefined} value Raw environment value.
 * @returns {number} A valid timeout in milliseconds.
 */
const parseTimeout = (value) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
};

/**
 * Request timeout in milliseconds, configurable via `GITHUB_API_TIMEOUT_MS`.
 */
const HTTP_TIMEOUT_MS = parseTimeout(process.env.GITHUB_API_TIMEOUT_MS);

/**
 * Keep-alive agents reuse TCP/TLS connections to the GitHub API. This removes
 * a full TLS handshake from most requests on long-running (self-hosted)
 * instances.
 */
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 32,
  timeout: HTTP_TIMEOUT_MS,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 32,
  timeout: HTTP_TIMEOUT_MS,
});

/**
 * Network options shared by every outbound HTTP request.
 *
 * @returns {{ timeout: number, httpAgent: import("node:http").Agent, httpsAgent: import("node:https").Agent }} Axios network options.
 */
const getNetworkOptions = () => ({
  timeout: HTTP_TIMEOUT_MS,
  httpAgent,
  httpsAgent,
});

/**
 * Send GraphQL request to GitHub API.
 *
 * @param {import('axios').AxiosRequestConfig['data']} data Request data.
 * @param {import('axios').AxiosRequestConfig['headers']} headers Request headers.
 * @returns {Promise<any>} Request response.
 */
const request = (data, headers) => {
  return axios({
    url: GITHUB_GRAPHQL_ENDPOINT,
    method: "post",
    headers,
    data,
    ...getNetworkOptions(),
  });
};

export {
  request,
  getNetworkOptions,
  HTTP_TIMEOUT_MS,
  DEFAULT_TIMEOUT_MS,
  httpAgent,
  httpsAgent,
};
