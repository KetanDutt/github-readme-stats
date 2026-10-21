// @ts-check

import toEmoji from "emoji-name-map";

/**
 * Returns boolean if value is either "true" or "false" else the value as it is.
 *
 * @param {string | boolean} value The value to parse.
 * @returns {boolean | undefined } The parsed value.
 */
const parseBoolean = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value.toLowerCase() === "true") {
      return true;
    } else if (value.toLowerCase() === "false") {
      return false;
    }
  }
  return undefined;
};

/**
 * Parse a comma separated string (or an already parsed array) into a clean
 * array of strings. Values are trimmed and empty entries are dropped, so that
 * `?hide=stars, prs` behaves the same as `?hide=stars,prs`.
 *
 * @param {string | string[] | undefined | null} str The string (or array) to parse.
 * @returns {string[]} The array of strings.
 */
const parseArray = (str) => {
  if (!str) {
    return [];
  }

  // Express/Node query parsers return an array when a parameter is repeated,
  // e.g. `?hide=stars&hide=prs`. Handle that instead of crashing on `.split`.
  const values = Array.isArray(str) ? str : String(str).split(",");

  return values.map((value) => String(value).trim()).filter(Boolean);
};

/**
 * Clamp the given number between the given range.
 *
 * @param {number} number The number to clamp.
 * @param {number} min The minimum value.
 * @param {number} max The maximum value.
 * @returns {number} The clamped number.
 */
const clampValue = (number, min, max) => {
  // @ts-ignore
  if (Number.isNaN(parseInt(number, 10))) {
    return min;
  }
  return Math.max(min, Math.min(number, max));
};

/**
 * Normalize a query parameter into a single string.
 *
 * Express/Node return an array when the same query parameter is repeated
 * (`?locale=en&locale=fr`). Only the first value is meaningful for scalar
 * options, and non-string values are ignored instead of crashing the handler.
 *
 * @param {string | string[] | undefined | null} value The value to normalize.
 * @returns {string | undefined} The first string value, if any.
 */
const normalizeString = (value) => {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.find((item) => typeof item === "string");
  }
  return undefined;
};

/**
 * Parse a value into an integer, returning `undefined` for anything that is
 * not a finite number. This keeps NaN out of generated SVG markup.
 *
 * @param {string | number | undefined | null} value The value to parse.
 * @returns {number | undefined} The parsed integer or undefined.
 */
const parseIntOrUndefined = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Parse a value into a finite float, returning `undefined` for anything that
 * is not a finite number.
 *
 * @param {string | number | undefined | null} value The value to parse.
 * @returns {number | undefined} The parsed float or undefined.
 */
const parseFloatOrUndefined = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Lowercase and trim string.
 *
 * @param {string} name String to lowercase and trim.
 * @returns {string} Lowercased and trimmed string.
 */
const lowercaseTrim = (name) => name.toLowerCase().trim();

/**
 * Split array of languages in two columns.
 *
 * @template T Language object.
 * @param {Array<T>} arr Array of languages.
 * @param {number} perChunk Number of languages per column.
 * @returns {Array<T>} Array of languages split in two columns.
 */
const chunkArray = (arr, perChunk) => {
  return arr.reduce((resultArray, item, index) => {
    const chunkIndex = Math.floor(index / perChunk);

    if (!resultArray[chunkIndex]) {
      // @ts-ignore
      resultArray[chunkIndex] = []; // start a new chunk
    }

    // @ts-ignore
    resultArray[chunkIndex].push(item);

    return resultArray;
  }, []);
};

/**
 * Parse emoji from string.
 *
 * @param {string} str String to parse emoji from.
 * @returns {string} String with emoji parsed.
 */
const parseEmojis = (str) => {
  if (!str) {
    throw new Error("[parseEmoji]: str argument not provided");
  }
  return str.replace(/:\w+:/gm, (emoji) => {
    return toEmoji.get(emoji) || "";
  });
};

/**
 * Get diff in minutes between two dates.
 *
 * @param {Date} d1 First date.
 * @param {Date} d2 Second date.
 * @returns {number} Number of minutes between the two dates.
 */
const dateDiff = (d1, d2) => {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  const diff = date1.getTime() - date2.getTime();
  return Math.round(diff / (1000 * 60));
};

export {
  parseBoolean,
  parseArray,
  clampValue,
  lowercaseTrim,
  chunkArray,
  parseEmojis,
  dateDiff,
  parseIntOrUndefined,
  parseFloatOrUndefined,
  normalizeString,
};
