// @ts-check

import { CustomError } from "./error.js";
import { logger } from "./log.js";

/**
 * Number of configured tokens at import time.
 *
 * @deprecated Prefer {@link getPATs}, which resolves tokens at call time.
 */
const RETRIES =
  process.env.NODE_ENV === "test"
    ? 7
    : Object.keys(process.env).filter((key) => /^PAT_\d+$/.test(key)).length;

/**
 * Retrieves the GitHub token environment variable names (`PAT_1`, `PAT_2`, ...)
 * sorted by their numeric suffix.
 *
 * Tokens are resolved lazily (instead of at module load) so that `.env` files
 * loaded by `dotenv` after this module is imported are still picked up, and so
 * that non-contiguous token numbers (`PAT_1`, `PAT_3`) work as expected.
 *
 * @returns {string[]} The sorted token variable names.
 */
const getPATs = () => {
  const pats = Object.keys(process.env)
    .filter((key) => /^PAT_\d+$/.test(key) && process.env[key])
    .sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)));

  // Tests may not define real tokens. In that case we still simulate one
  // attempt per configured retry so that the retry logic can be exercised.
  if (pats.length === 0 && process.env.NODE_ENV === "test") {
    return Array.from({ length: RETRIES }, (_, i) => `PAT_${i + 1}`);
  }

  return pats;
};

/**
 * @typedef {import("axios").AxiosResponse} AxiosResponse Axios response.
 * @typedef {(variables: any, token: string, retriesForTests?: number) => Promise<AxiosResponse>} FetcherFunction Fetcher function.
 */

/**
 * Whether the given response is a GitHub GraphQL rate-limit response.
 *
 * @param {AxiosResponse | undefined} response The response to check.
 * @returns {boolean} True if the response signals rate limiting.
 */
const isRateLimitedResponse = (response) => {
  const errors = response?.data?.errors;
  const errorType = errors?.[0]?.type;
  const errorMsg = errors?.[0]?.message || "";

  // react on both type and message-based rate-limit signals.
  // https://github.com/anuraghazra/github-readme-stats/issues/4425
  return Boolean(
    (errors && errorType === "RATE_LIMITED") || /rate limit/i.test(errorMsg),
  );
};

/**
 * Whether an HTTP error means the token itself is unusable.
 *
 * @param {any} error The caught error.
 * @returns {boolean} True when another token should be tried.
 */
const isInvalidTokenError = (error) => {
  const message = error?.response?.data?.message;
  // also checking for bad credentials if any tokens gets invalidated
  return (
    message === "Bad credentials" ||
    message === "Sorry. Your account was suspended."
  );
};

/**
 * Try to execute the fetcher function until it succeeds or the max number of
 * retries is reached. Each attempt uses a different GitHub token.
 *
 * @param {FetcherFunction} fetcher The fetcher function.
 * @param {any} variables Object with arguments to pass to the fetcher function.
 * @param {number} [retries=0] Index of the first token to use.
 * @returns {Promise<any>} The response from the fetcher function.
 * @throws {CustomError} When no tokens are configured or all tokens are exhausted.
 */
const retryer = async (fetcher, variables, retries = 0) => {
  const pats = getPATs();

  if (pats.length === 0) {
    throw new CustomError("No GitHub API tokens found", CustomError.NO_TOKENS);
  }

  for (let index = retries; index < pats.length; index++) {
    const pat = pats[index];

    try {
      const response = await fetcher(
        variables,
        // @ts-ignore
        process.env[pat],
        // used in tests for faking rate limit
        index,
      );

      // if rate limit is hit try the next token
      if (isRateLimitedResponse(response)) {
        logger.log(`${pat} Failed`);
        continue;
      }

      // finally return the response
      return response;
    } catch (err) {
      /** @type {any} */
      const e = err;

      // network/unexpected error → let caller treat as failure
      if (!e?.response) {
        throw e;
      }

      if (isInvalidTokenError(e)) {
        logger.log(`${pat} Failed`);
        continue;
      }

      // HTTP error with a response → return it for caller-side handling
      return e.response;
    }
  }

  throw new CustomError(
    "Downtime due to GitHub API rate limiting",
    CustomError.MAX_RETRY,
  );
};

export { retryer, getPATs, RETRIES };
export default retryer;
