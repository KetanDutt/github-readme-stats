// @ts-check

/**
 * @file Renders the landing page served by the bundled Express server.
 *
 * The public Vercel deployment redirects `/` to the GitHub repository, but a
 * self-hosted instance benefits from a small dashboard that shows live card
 * examples, the available endpoints and the instance configuration.
 */

/**
 * @typedef {object} LandingPageOptions
 * @property {string} version Package version.
 * @property {boolean} hasTokens Whether at least one GitHub token is configured.
 * @property {number} themeCount Number of available themes.
 * @property {boolean} cacheEnabled Whether the in-memory cache is enabled.
 * @property {string} demoUsername Username used for the live previews.
 */

/**
 * Renders the landing page HTML.
 *
 * @param {LandingPageOptions} options Page options.
 * @returns {string} HTML document.
 */
const renderLandingPage = ({
  version,
  hasTokens,
  themeCount,
  cacheEnabled,
  demoUsername,
}) => {
  const cards = [
    {
      title: "GitHub Stats",
      description: "Commits, stars, pull requests and rank.",
      url: `/api?username=${demoUsername}&show_icons=true&theme=default`,
    },
    {
      title: "Top Languages",
      description: "The languages you use the most.",
      url: `/api/top-langs?username=${demoUsername}&layout=compact&langs_count=6`,
    },
    {
      title: "Repository Pin",
      description: "Pin a repository with stars and forks.",
      url: `/api/pin?username=${demoUsername}&repo=github-readme-stats`,
    },
    {
      title: "WakaTime",
      description: "Weekly coding activity from WakaTime.",
      url: `/api/wakatime?username=${demoUsername}`,
    },
  ];

  const endpoints = [
    ["GET /api", "GitHub stats card", "username, hide, show_icons, theme, ..."],
    ["GET /api/pin", "Repository pin card", "username, repo, theme, ..."],
    ["GET /api/top-langs", "Top languages card", "username, layout, hide, ..."],
    ["GET /api/gist", "Gist pin card", "id, theme, ..."],
    ["GET /api/wakatime", "WakaTime card", "username, layout, ..."],
    ["GET /api/status/up", "Instance uptime badge", "type=json|shields"],
    ["GET /api/status/pat-info", "Token health report", "-"],
    ["GET /health", "Health probe (JSON)", "-"],
  ];

  const cardMarkup = cards
    .map(
      (card) => `
        <article class="card">
          <h3>${card.title}</h3>
          <p>${card.description}</p>
          <img src="${card.url}" alt="${card.title} card" loading="lazy" />
          <code>${card.url.replace(/&/g, "&amp;")}</code>
        </article>`,
    )
    .join("");

  const endpointRows = endpoints
    .map(
      ([route, description, params]) => `
        <tr>
          <td><code>${route}</code></td>
          <td>${description}</td>
          <td>${params}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>GitHub Readme Stats · self-hosted</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #0d1117;
        --surface: #161b22;
        --border: #30363d;
        --text: #c9d1d9;
        --muted: #8b949e;
        --accent: #58a6ff;
        --ok: #3fb950;
        --warn: #d29922;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font: 15px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      header {
        padding: 48px 24px 24px;
        text-align: center;
        border-bottom: 1px solid var(--border);
      }
      h1 { margin: 0 0 8px; font-size: 30px; }
      h1 span { color: var(--accent); }
      .subtitle { color: var(--muted); margin: 0 auto; max-width: 720px; }
      main { max-width: 1100px; margin: 0 auto; padding: 32px 24px 64px; }
      .badges { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 20px; }
      .badge {
        display: inline-flex; align-items: center; gap: 6px;
        border: 1px solid var(--border); border-radius: 999px;
        padding: 4px 12px; font-size: 13px; background: var(--surface);
      }
      .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ok); }
      .dot.warn { background: var(--warn); }
      h2 { margin: 40px 0 16px; font-size: 20px; }
      .grid { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
      .card {
        background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
        padding: 20px; display: flex; flex-direction: column; gap: 12px;
      }
      .card h3 { margin: 0; font-size: 16px; }
      .card p { margin: 0; color: var(--muted); font-size: 14px; }
      .card img { width: 100%; height: auto; min-height: 60px; }
      code {
        font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
        font-size: 12px; color: var(--accent);
        background: rgba(88, 166, 255, 0.1);
        border-radius: 6px; padding: 4px 8px; overflow-wrap: anywhere;
      }
      table { width: 100%; border-collapse: collapse; font-size: 14px; }
      th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
      th { color: var(--muted); font-weight: 600; }
      footer { text-align: center; color: var(--muted); font-size: 13px; padding: 24px; border-top: 1px solid var(--border); }
      a { color: var(--accent); }
      @media (max-width: 600px) { header { padding-top: 32px; } h1 { font-size: 24px; } }
    </style>
  </head>
  <body>
    <header>
      <h1>GitHub <span>Readme</span> Stats</h1>
      <p class="subtitle">
        Dynamically generated GitHub stats for your READMEs. This instance is
        self-hosted with the bundled Express server.
      </p>
      <div class="badges">
        <span class="badge"><span class="dot"></span> v${version}</span>
        <span class="badge">
          <span class="dot ${hasTokens ? "" : "warn"}"></span>
          ${hasTokens ? "GitHub tokens configured" : "No GitHub tokens configured"}
        </span>
        <span class="badge">${themeCount} themes</span>
        <span class="badge">Memory cache ${cacheEnabled ? "on" : "off"}</span>
      </div>
    </header>
    <main>
      <h2>Live cards</h2>
      <div class="grid">${cardMarkup}</div>

      <h2>Endpoints</h2>
      <table>
        <thead>
          <tr><th>Route</th><th>Description</th><th>Common parameters</th></tr>
        </thead>
        <tbody>${endpointRows}</tbody>
      </table>

      <h2>Usage</h2>
      <p>Embed any card in your markdown:</p>
      <code>![GitHub Stats](https://your-instance.example.com/api?username=${demoUsername})</code>
      <p style="margin-top: 16px;">
        Full documentation lives in the
        <a href="https://github.com/anuraghazra/github-readme-stats/tree/master/docs">docs folder</a>.
      </p>
    </main>
    <footer>github-readme-stats · MIT licensed</footer>
  </body>
</html>`;
};

export { renderLandingPage };
