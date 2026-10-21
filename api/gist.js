// @ts-check

import {
  buildErrorCard,
  buildInputErrorCard,
  setSvgContentType,
} from "../src/common/api.js";
import { isLocaleAvailable } from "../src/translations.js";
import { renderGistCard } from "../src/cards/gist.js";
import { fetchGist } from "../src/fetchers/gist.js";
import {
  CACHE_TTL,
  resolveCacheSeconds,
  setCacheHeaders,
  setErrorCacheHeaders,
} from "../src/common/cache.js";
import { guardAccess } from "../src/common/access.js";
import { normalizeString, parseBoolean } from "../src/common/ops.js";

// @ts-ignore
export default async (req, res) => {
  const {
    id,
    title_color,
    icon_color,
    text_color,
    bg_color,
    theme,
    cache_seconds,
    locale,
    border_radius,
    border_color,
    show_owner,
    hide_border,
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
    id,
    type: "gist",
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
    const gistData = await fetchGist(id);
    const cacheSeconds = resolveCacheSeconds({
      requested: parseInt(cache_seconds, 10),
      def: CACHE_TTL.GIST_CARD.DEFAULT,
      min: CACHE_TTL.GIST_CARD.MIN,
      max: CACHE_TTL.GIST_CARD.MAX,
    });

    setCacheHeaders(res, cacheSeconds);

    return res.send(
      renderGistCard(gistData, {
        title_color,
        icon_color,
        text_color,
        bg_color,
        theme,
        border_radius,
        border_color,
        locale: normalizedLocale ? normalizedLocale.toLowerCase() : null,
        show_owner: parseBoolean(show_owner),
        hide_border: parseBoolean(hide_border),
      }),
    );
  } catch (err) {
    setErrorCacheHeaders(res);
    return res.send(buildErrorCard({ err, colors }));
  }
};
