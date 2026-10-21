// @ts-check

/**
 * @file Shared helpers for the serverless API handlers.
 *
 * Keeping the response building in one place guarantees that every card
 * endpoint renders errors the same way and makes the handlers shorter and
 * easier to reason about.
 */

import { MissingParamError, retrieveSecondaryMessage } from "./error.js";
import { renderError } from "./render.js";

/**
 * @typedef {{
 *   title_color?: string,
 *   text_color?: string,
 *   bg_color?: string,
 *   border_color?: string,
 *   theme?: string
 * }} ErrorColors Colors used for the error card.
 */

/**
 * Sets the SVG content type on a response.
 *
 * @param {any} res The response object.
 * @returns {void}
 */
const setSvgContentType = (res) => {
  res.setHeader("Content-Type", "image/svg+xml");
};

/**
 * Builds an error card for a user input problem (invalid query parameter,
 * unsupported locale, ...). No "file an issue" link is rendered because the
 * problem is on the caller's side.
 *
 * @param {object} args Function arguments.
 * @param {ErrorColors} args.colors Colors for the error card.
 * @param {string} [args.message="Something went wrong"] Main message.
 * @param {string} [args.secondaryMessage] Secondary message.
 * @returns {string} The error card SVG.
 */
const buildInputErrorCard = ({
  colors,
  message = "Something went wrong",
  secondaryMessage,
}) => {
  return renderError({
    message,
    secondaryMessage,
    renderOptions: {
      ...colors,
      show_repo_link: false,
    },
  });
};

/**
 * Builds the error card for a thrown error.
 *
 * @param {object} args Function arguments.
 * @param {unknown} args.err The thrown error.
 * @param {ErrorColors} args.colors Colors for the error card.
 * @returns {string} The error card SVG.
 */
const buildErrorCard = ({ err, colors }) => {
  if (err instanceof Error) {
    return renderError({
      message: err.message,
      secondaryMessage: retrieveSecondaryMessage(err),
      renderOptions: {
        ...colors,
        show_repo_link: !(err instanceof MissingParamError),
      },
    });
  }

  return renderError({
    message: "An unknown error occurred",
    renderOptions: colors,
  });
};

export { setSvgContentType, buildInputErrorCard, buildErrorCard };
