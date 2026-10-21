// @ts-check

import { renderStatsCard } from "../src/cards/stats.js";
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
import { fetchStats } from "../src/fetchers/stats.js";
import { isLocaleAvailable } from "../src/translations.js";

const MIN_COMMITS_YEAR = 2008;

/**
 * Validates the `commits_year` query parameter.
 *
 * @param {number | undefined} commitsYear Parsed year.
 * @returns {boolean} Whether the year is usable.
 */
const isValidCommitsYear = (commitsYear) => {
  if (commitsYear === undefined) {
    return true;
  }
  return (
    commitsYear >= MIN_COMMITS_YEAR && commitsYear <= new Date().getFullYear()
  );
};

// @ts-ignore
export default async (req, res) => {
  const {
    username,
    hide,
    hide_title,
    hide_border,
    card_width,
    hide_rank,
    show_icons,
    include_all_commits,
    commits_year,
    line_height,
    title_color,
    ring_color,
    icon_color,
    text_color,
    text_bold,
    bg_color,
    theme,
    cache_seconds,
    exclude_repo,
    custom_title,
    locale,
    disable_animations,
    border_radius,
    number_format,
    number_precision,
    border_color,
    rank_icon,
    show,
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

  const parsedCommitsYear = parseIntOrUndefined(commits_year);

  if (!isValidCommitsYear(parsedCommitsYear)) {
    return res.send(
      buildInputErrorCard({
        colors,
        secondaryMessage: `Incorrect commits_year input, it must be between ${MIN_COMMITS_YEAR} and ${new Date().getFullYear()}`,
      }),
    );
  }

  try {
    const showStats = parseArray(show);
    const stats = await fetchStats(
      username,
      parseBoolean(include_all_commits),
      parseArray(exclude_repo),
      showStats.includes("prs_merged") ||
        showStats.includes("prs_merged_percentage"),
      showStats.includes("discussions_started"),
      showStats.includes("discussions_answered"),
      parsedCommitsYear,
    );
    const cacheSeconds = resolveCacheSeconds({
      requested: parseInt(cache_seconds, 10),
      def: CACHE_TTL.STATS_CARD.DEFAULT,
      min: CACHE_TTL.STATS_CARD.MIN,
      max: CACHE_TTL.STATS_CARD.MAX,
    });

    setCacheHeaders(res, cacheSeconds);

    return res.send(
      renderStatsCard(stats, {
        hide: parseArray(hide),
        show_icons: parseBoolean(show_icons),
        hide_title: parseBoolean(hide_title),
        hide_border: parseBoolean(hide_border),
        card_width: parseIntOrUndefined(card_width),
        hide_rank: parseBoolean(hide_rank),
        include_all_commits: parseBoolean(include_all_commits),
        commits_year: parsedCommitsYear,
        line_height,
        title_color,
        ring_color,
        icon_color,
        text_color,
        text_bold: parseBoolean(text_bold),
        bg_color,
        theme,
        custom_title,
        border_radius,
        border_color,
        number_format,
        number_precision: parseIntOrUndefined(number_precision),
        locale: normalizedLocale ? normalizedLocale.toLowerCase() : null,
        disable_animations: parseBoolean(disable_animations),
        rank_icon,
        show: showStats,
      }),
    );
  } catch (err) {
    setErrorCacheHeaders(res);
    return res.send(buildErrorCard({ err, colors }));
  }
};
