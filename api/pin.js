// @ts-check

import { renderRepoCard } from "../src/cards/repo.js";
import { guardAccess } from "../src/common/access.js";
import {
  buildErrorCard,
  buildInputErrorCard,
  setSvgContentType,
} from "../src/common/api.js";
import {
  CACHE_TTL,
  resolveCacheSeconds,
  setCacheHeaders,
  setErrorCacheHeaders,
} from "../src/common/cache.js";
import { normalizeString, parseBoolean } from "../src/common/ops.js";
import { fetchRepo } from "../src/fetchers/repo.js";
import { isLocaleAvailable } from "../src/translations.js";

// @ts-ignore
export default async (req, res) => {
  const {
    username,
    repo,
    hide_border,
    title_color,
    icon_color,
    text_color,
    bg_color,
    theme,
    show_owner,
    cache_seconds,
    locale,
    border_radius,
    border_color,
    description_lines_count,
  } = req.query;

  setSvgContentType(res);

  const normalizedLocale = normalizeString(locale);

  const colors = {
    title_color,
    text_color,
    bg_color,
    border_color,
    theme,
  };

  const access = guardAccess({
    res,
    id: username,
    type: "username",
    colors,
  });
  if (!access.isPassed) {
    return access.result;
  }

  if (normalizedLocale && !isLocaleAvailable(normalizedLocale)) {
    return res.send(
      buildInputErrorCard({ colors, secondaryMessage: "Locale not found" }),
    );
  }

  try {
    const repoData = await fetchRepo(username, repo);
    const cacheSeconds = resolveCacheSeconds({
      requested: parseInt(cache_seconds, 10),
      def: CACHE_TTL.PIN_CARD.DEFAULT,
      min: CACHE_TTL.PIN_CARD.MIN,
      max: CACHE_TTL.PIN_CARD.MAX,
    });

    setCacheHeaders(res, cacheSeconds);

    return res.send(
      renderRepoCard(repoData, {
        hide_border: parseBoolean(hide_border),
        title_color,
        icon_color,
        text_color,
        bg_color,
        theme,
        border_radius,
        border_color,
        show_owner: parseBoolean(show_owner),
        locale: normalizedLocale ? normalizedLocale.toLowerCase() : null,
        description_lines_count,
      }),
    );
  } catch (err) {
    setErrorCacheHeaders(res);
    return res.send(buildErrorCard({ err, colors }));
  }
};
