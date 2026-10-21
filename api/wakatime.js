// @ts-check

import { renderWakatimeCard } from "../src/cards/wakatime.js";
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
  parseIntOrUndefined,
} from "../src/common/ops.js";
import { fetchWakatimeStats } from "../src/fetchers/wakatime.js";
import { isLocaleAvailable } from "../src/translations.js";

const LAYOUTS = ["compact", "normal"];
const DISPLAY_FORMATS = ["time", "percent"];

// @ts-ignore
export default async (req, res) => {
  const {
    username,
    title_color,
    icon_color,
    hide_border,
    card_width,
    line_height,
    text_color,
    bg_color,
    theme,
    cache_seconds,
    hide_title,
    hide_progress,
    custom_title,
    locale,
    layout,
    langs_count,
    hide,
    api_domain,
    border_radius,
    border_color,
    display_format,
    disable_animations,
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
    type: "wakatime",
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

  if (
    display_format !== undefined &&
    !DISPLAY_FORMATS.includes(display_format)
  ) {
    return res.send(
      buildInputErrorCard({
        colors,
        secondaryMessage: "Incorrect display_format input",
      }),
    );
  }

  try {
    const stats = await fetchWakatimeStats({ username, api_domain });
    const cacheSeconds = resolveCacheSeconds({
      requested: parseInt(cache_seconds, 10),
      def: CACHE_TTL.WAKATIME_CARD.DEFAULT,
      min: CACHE_TTL.WAKATIME_CARD.MIN,
      max: CACHE_TTL.WAKATIME_CARD.MAX,
    });

    setCacheHeaders(res, cacheSeconds);

    return res.send(
      renderWakatimeCard(stats, {
        custom_title,
        hide_title: parseBoolean(hide_title),
        hide_border: parseBoolean(hide_border),
        card_width: parseIntOrUndefined(card_width),
        hide: parseArray(hide),
        line_height,
        title_color,
        icon_color,
        text_color,
        bg_color,
        theme,
        hide_progress: parseBoolean(hide_progress),
        border_radius,
        border_color,
        locale: normalizedLocale ? normalizedLocale.toLowerCase() : null,
        layout,
        langs_count: parseIntOrUndefined(langs_count),
        display_format,
        disable_animations: parseBoolean(disable_animations),
      }),
    );
  } catch (err) {
    setErrorCacheHeaders(res);
    return res.send(buildErrorCard({ err, colors }));
  }
};
