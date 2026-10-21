// @ts-check

import { renderTopLanguages } from "../src/cards/top-languages.js";
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
import {
  normalizeString,
  parseArray,
  parseBoolean,
  parseFloatOrUndefined,
  parseIntOrUndefined,
} from "../src/common/ops.js";
import { fetchTopLanguages } from "../src/fetchers/top-languages.js";
import { isLocaleAvailable } from "../src/translations.js";

const LAYOUTS = ["compact", "normal", "donut", "donut-vertical", "pie"];
const STATS_FORMATS = ["bytes", "percentages"];

// @ts-ignore
export default async (req, res) => {
  const {
    username,
    hide,
    hide_title,
    hide_border,
    card_width,
    title_color,
    text_color,
    bg_color,
    theme,
    cache_seconds,
    layout,
    langs_count,
    exclude_repo,
    size_weight,
    count_weight,
    custom_title,
    locale,
    border_radius,
    border_color,
    disable_animations,
    hide_progress,
    stats_format,
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

  if (layout !== undefined && !LAYOUTS.includes(layout)) {
    return res.send(
      buildInputErrorCard({
        colors,
        secondaryMessage: "Incorrect layout input",
      }),
    );
  }

  if (stats_format !== undefined && !STATS_FORMATS.includes(stats_format)) {
    return res.send(
      buildInputErrorCard({
        colors,
        secondaryMessage: "Incorrect stats_format input",
      }),
    );
  }

  // Weights must be finite and non-negative, otherwise the computed language
  // sizes become NaN and the card renders broken progress bars.
  const parsedSizeWeight = parseFloatOrUndefined(size_weight) ?? 1;
  const parsedCountWeight = parseFloatOrUndefined(count_weight) ?? 0;

  if (parsedSizeWeight < 0 || parsedCountWeight < 0) {
    return res.send(
      buildInputErrorCard({
        colors,
        secondaryMessage: "Incorrect size_weight or count_weight input",
      }),
    );
  }

  try {
    const topLangs = await fetchTopLanguages(
      username,
      parseArray(exclude_repo),
      parsedSizeWeight,
      parsedCountWeight,
    );
    const cacheSeconds = resolveCacheSeconds({
      requested: parseInt(cache_seconds, 10),
      def: CACHE_TTL.TOP_LANGS_CARD.DEFAULT,
      min: CACHE_TTL.TOP_LANGS_CARD.MIN,
      max: CACHE_TTL.TOP_LANGS_CARD.MAX,
    });

    setCacheHeaders(res, cacheSeconds);

    return res.send(
      renderTopLanguages(topLangs, {
        custom_title,
        hide_title: parseBoolean(hide_title),
        hide_border: parseBoolean(hide_border),
        card_width: parseIntOrUndefined(card_width),
        hide: parseArray(hide),
        title_color,
        text_color,
        bg_color,
        theme,
        layout,
        langs_count: parseIntOrUndefined(langs_count),
        border_radius,
        border_color,
        locale: normalizedLocale ? normalizedLocale.toLowerCase() : null,
        disable_animations: parseBoolean(disable_animations),
        hide_progress: parseBoolean(hide_progress),
        stats_format,
      }),
    );
  } catch (err) {
    setErrorCacheHeaders(res);
    return res.send(buildErrorCard({ err, colors }));
  }
};
