// @ts-check

import { retryer } from "../common/retryer.js";
import { logger } from "../common/log.js";
import { excludeRepositories } from "../common/envs.js";
import { CustomError, MissingParamError } from "../common/error.js";
import { wrapTextMultiline } from "../common/fmt.js";
import { request } from "../common/http.js";

/**
 * Top languages fetcher object.
 *
 * @param {any} variables Fetcher variables.
 * @param {string} token GitHub token.
 * @returns {Promise<import("axios").AxiosResponse>} Languages fetcher response.
 */
const fetcher = (variables, token) => {
  return request(
    {
      query: `
      query userInfo($login: String!) {
        user(login: $login) {
          # fetch only owner repos & not forks
          repositories(ownerAffiliations: OWNER, isFork: false, first: 100) {
            nodes {
              name
              languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
                edges {
                  size
                  node {
                    color
                    name
                  }
                }
              }
            }
          }
        }
      }
      `,
      variables,
    },
    {
      Authorization: `token ${token}`,
    },
  );
};

/**
 * @typedef {import("./types").TopLangData} TopLangData Top languages data.
 * @typedef {import("./types").Lang} Lang Language data.
 */

/**
 * Fetch top languages for a given username.
 *
 * @param {string} username GitHub username.
 * @param {string[]} exclude_repo List of repositories to exclude.
 * @param {number} size_weight Weightage to be given to size.
 * @param {number} count_weight Weightage to be given to count.
 * @returns {Promise<TopLangData>} Top languages data.
 */
const fetchTopLanguages = async (
  username,
  exclude_repo = [],
  size_weight = 1,
  count_weight = 0,
) => {
  if (!username) {
    throw new MissingParamError(["username"]);
  }

  const res = await retryer(fetcher, { login: username });

  if (res?.data?.errors) {
    logger.error(res.data.errors);
    if (res.data.errors[0].type === "NOT_FOUND") {
      throw new CustomError(
        res.data.errors[0].message || "Could not fetch user.",
        CustomError.USER_NOT_FOUND,
      );
    }
    if (res.data.errors[0].message) {
      throw new CustomError(
        wrapTextMultiline(res.data.errors[0].message, 90, 1)[0],
        res.statusText,
      );
    }
    throw new CustomError(
      "Something went wrong while trying to retrieve the language data using the GraphQL API.",
      CustomError.GRAPHQL_ERROR,
    );
  }

  const repoNodes = res?.data?.data?.user?.repositories?.nodes;

  if (!Array.isArray(repoNodes)) {
    throw new CustomError(
      "Something went wrong while trying to retrieve the language data using the GraphQL API.",
      CustomError.GRAPHQL_ERROR,
    );
  }

  const allExcludedRepos = new Set([...exclude_repo, ...excludeRepositories]);

  // Aggregate language sizes and the number of repositories each language
  // appears in. Counting per repository (instead of per language edge run)
  // keeps `count_weight` correct when repositories interleave languages.
  /** @type {Record<string, Lang>} */
  const languages = {};

  repoNodes.forEach((repo) => {
    if (!repo || allExcludedRepos.has(repo.name)) {
      return;
    }

    const seenInRepo = new Set();

    (repo.languages?.edges ?? []).forEach((edge) => {
      const name = edge?.node?.name;
      if (!name) {
        return;
      }

      if (!languages[name]) {
        languages[name] = {
          name,
          color: edge.node.color,
          size: 0,
          count: 0,
        };
      }

      languages[name].size += edge.size || 0;

      if (!seenInRepo.has(name)) {
        languages[name].count += 1;
        seenInRepo.add(name);
      }
    });
  });

  Object.keys(languages).forEach((name) => {
    // comparison index calculation
    languages[name].size =
      Math.pow(languages[name].size, size_weight) *
      Math.pow(languages[name].count, count_weight);
  });

  const topLangs = Object.keys(languages)
    .sort((a, b) => languages[b].size - languages[a].size)
    .reduce((result, key) => {
      result[key] = languages[key];
      return result;
    }, {});

  return topLangs;
};

export { fetchTopLanguages };
export default fetchTopLanguages;
