import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "../../..");
const distDirectory = path.join(projectRoot, "dist");
const distIndexPath = path.join(distDirectory, "index.html");

function extractCssHref(html: string): string {
  const match = html.match(/<link rel="stylesheet" href="([^"]+)">/u);

  if (!match) {
    throw new Error("Unable to find stylesheet link in built renderer HTML.");
  }

  return match[1];
}

function prefixSelector(selector: string, rootSelector: string): string {
  const trimmed = selector.trim();

  if (!trimmed) {
    return trimmed;
  }

  if (trimmed === ":root" || trimmed === "html" || trimmed === "body" || trimmed === "html, body") {
    return rootSelector;
  }

  if (trimmed === "html,body") {
    return rootSelector;
  }

  if (trimmed.startsWith(rootSelector)) {
    return trimmed;
  }

  return `${rootSelector} ${trimmed}`;
}

function scopeCssSelectors(css: string, rootSelector: string): string {
  return css.replace(/(^|\})([^@}{][^{}]*)\{/gmu, (_full, boundary, selectorBlock) => {
    const scopedSelectors = selectorBlock
      .split(",")
      .map((selector: string) => prefixSelector(selector, rootSelector))
      .join(", ");

    return `${boundary}${scopedSelectors}{`;
  });
}

function buildCustomHtmlOverrides(): string {
  return [
    ".ab-intelligence-desk{min-height:auto!important;margin:0!important;padding:0!important;background:transparent!important;}",
    ".ab-intelligence-desk .skip-link{display:none!important;}",
    ".ab-intelligence-desk .page-shell{max-width:none!important;width:100%!important;margin:0!important;padding:0!important;gap:24px!important;}",
    ".ab-intelligence-desk .intro-shell,.ab-intelligence-desk .section-shell{padding:16px!important;}",
    ".ab-intelligence-desk .section-grid{align-items:start;}",
    ".ab-intelligence-desk .state-card__label{white-space:nowrap;}",
    ".ab-intelligence-desk .loading-card,.ab-intelligence-desk .error-card{display:grid;gap:12px;padding:16px;border:1px solid var(--color-line);border-radius:var(--radius-lg);background:var(--color-surface);}",
    ".ab-intelligence-desk .config-card{display:grid;gap:10px;padding:16px;border:1px dashed var(--color-line);border-radius:var(--radius-lg);background:var(--color-surface-alt);}",
    ".ab-intelligence-desk .config-card code,.ab-intelligence-desk .error-card code{word-break:break-all;}",
    "@media(max-width:720px){.ab-intelligence-desk .page-shell{gap:16px!important;}}"
  ].join("");
}

function buildLiveRendererScript(): string {
  return `
(function () {
  const root = document.currentScript.previousElementSibling;
  if (!root) return;

  const placeholderUrl = "https://YOUR-HOSTED-SNAPSHOT-URL/snapshot.json";
  const snapshotUrl = root.dataset.snapshotUrl || placeholderUrl;
  const refreshIntervalMs = 5 * 60 * 1000;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(value) {
    try {
      return new Date(value).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short"
      });
    } catch {
      return value;
    }
  }

  function slug(value) {
    return String(value ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function renderStateCard(column) {
    if (!column.state || column.state === "ready") return "";
    const labelMap = {
      empty: "Curated Gap",
      stale: "Stale",
      source_delayed: "Delayed"
    };
    const headlineMap = {
      empty: "Nothing strong enough to feature",
      stale: "Last verified view",
      source_delayed: "Source check delayed"
    };
    return \`
      <article class="stale-state-card stale-state-card--\${escapeHtml(column.state)}">
        <span class="state-card__label">\${escapeHtml(labelMap[column.state] || column.state)}</span>
        <h4>\${escapeHtml(headlineMap[column.state] || column.state)}</h4>
        <p>\${escapeHtml(column.state_message || "No current item is available.")}</p>
      </article>
    \`;
  }

  function renderBadge(item) {
    if (item.item_type === "status") {
      const tone = slug(item.status_label || "stable");
      return \`
        <span class="status-badge status-badge--\${escapeHtml(tone)}" aria-label="Status: \${escapeHtml(item.status_label || "Stable")}">
          <span class="badge-prefix">Status</span>
          <span>\${escapeHtml(item.status_label || "Stable")}</span>
        </span>
      \`;
    }

    if (item.item_type === "update") {
      const tone = slug(item.significance_tag || "minor");
      return \`
        <span class="significance-badge significance-badge--\${escapeHtml(tone)}" aria-label="Significance: \${escapeHtml(item.significance_tag || "Minor")}">
          <span class="badge-prefix">Signal</span>
          <span>\${escapeHtml(item.significance_tag || "Minor")}</span>
        </span>
      \`;
    }

    return "";
  }

  function renderSourceForward(item) {
    if (item.item_type !== "news") return "";
    return \`
      <p class="item-card__source-forward">
        <span class="item-card__source-prefix">Read the source:</span>
        <a href="\${escapeHtml(item.source_url)}" target="_blank" rel="noreferrer">\${escapeHtml(item.source_name)}</a>
      </p>
    \`;
  }

  function renderSummary(item) {
    if (item.item_type === "update") {
      return \`<p class="item-card__summary"><span class="item-card__summary-prefix">Plain-English takeaway:</span> \${escapeHtml(item.summary)}</p>\`;
    }

    if (item.item_type === "news") {
      return \`<p class="item-card__summary">\${escapeHtml(item.summary)}</p>\`;
    }

    return \`<p class="item-card__summary">\${escapeHtml(item.summary)}</p>\`;
  }

  function renderItemCard(item) {
    const tone =
      item.item_type === "status"
        ? \` item-card--\${slug(item.status_label || "stable")}\`
        : item.item_type === "update"
          ? \` item-card--\${slug(item.significance_tag || "minor")}\`
          : "";

    return \`
      <article class="item-card item-card--\${escapeHtml(item.item_type)}\${tone}">
        <div class="item-card__topline">\${renderBadge(item)}</div>
        <h4 class="item-card__headline">
          <a href="\${escapeHtml(item.source_url)}" target="_blank" rel="noreferrer">\${escapeHtml(item.headline)}</a>
        </h4>
        \${renderSourceForward(item)}
        \${renderSummary(item)}
        <div class="item-card__footer">
          <div class="metadata-row">
            <span class="metadata-pill">
              <span class="metadata-pill__label">Source</span>
              <a href="\${escapeHtml(item.source_url)}" target="_blank" rel="noreferrer">\${escapeHtml(item.source_name)}</a>
            </span>
            <span class="metadata-pill">
              <span class="metadata-pill__label">Published</span>
              <span>\${escapeHtml(formatDate(item.published_at))}</span>
            </span>
          </div>
        </div>
      </article>
    \`;
  }

  function renderColumn(column) {
    const stateCard = renderStateCard(column);
    const items = (column.items || []).map(renderItemCard).join("");
    return \`
      <div role="listitem">
        <article class="column-card" aria-label="\${escapeHtml(column.label)}">
          <header class="column-card__header">
            <h3 tabindex="-1">\${escapeHtml(column.label)}</h3>
          </header>
          <div class="column-card__body">
            \${stateCard}
            \${items}
          </div>
        </article>
      </div>
    \`;
  }

  function renderSection(section, index) {
    const eyebrowMap = {
      llm_status: "Operational Health",
      llm_model_updates: "Product Change",
      news: "Market Context"
    };
    const guidanceMap = {
      llm_status: "Use this band to answer: is the tool stable, degraded, or having real service trouble right now?",
      llm_model_updates: "Use this band to answer: what did the provider officially change, and why might it matter to your workflow?",
      news: "Use this band when you want broader business and investing context beyond provider-specific status and releases."
    };
    const toneClass = section.section_key === "news" ? "section-shell--secondary section-shell--news" :
      section.section_key === "llm_model_updates" ? "section-shell--primary section-shell--updates" :
      "section-shell--primary section-shell--status";

    return \`
      <section class="section-shell \${toneClass}" aria-label="\${escapeHtml(section.title)}" aria-roledescription="information section">
        <header class="section-shell__header">
          <div class="section-shell__eyebrow-row">
            <p class="section-shell__eyebrow">\${escapeHtml(eyebrowMap[section.section_key] || section.title)}</p>
            <span class="section-shell__ordinal">\${String(index + 1).padStart(2, "0")}</span>
          </div>
          <h2>\${escapeHtml(section.title)}</h2>
          <p>\${escapeHtml(section.description)}</p>
          <p class="section-shell__guidance">\${escapeHtml(guidanceMap[section.section_key] || "")}</p>
        </header>
        <div class="section-shell__body">
          <div class="section-grid" role="list" aria-label="\${escapeHtml(section.title)} columns">
            \${(section.columns || []).map(renderColumn).join("")}
          </div>
        </div>
      </section>
    \`;
  }

  function renderDesk(snapshot) {
    root.innerHTML = \`
      <main class="page-shell" id="desk-content">
        <section class="intro-shell">
          <div class="intro-shell__headline">
            <div>
              <p class="eyebrow">Private AI intelligence network</p>
              <h1>Intelligence Desk</h1>
              <p class="intro-shell__lede">One place to check whether a model is wobbling, what changed across major providers, and which AI business headlines are actually worth your attention.</p>
            </div>
            <div class="freshness-card" aria-label="Last updated">
              <span class="freshness-card__label">Last updated</span>
              <strong>\${escapeHtml(formatDate(snapshot.published_at || snapshot.generated_at))}</strong>
              <p>Snapshot cadence: every \${escapeHtml(String(snapshot.refresh_window_hours || 12))} hours.</p>
            </div>
          </div>
          <div class="intro-shell__guidance">
            <p><strong>Start here:</strong> Check \\\`LLM Status\\\` when a tool feels off, \\\`LLM/Model Updates\\\` when something new lands, and \\\`News\\\` when you want the broader market read.</p>
          </div>
        </section>
        \${(snapshot.sections || []).map(renderSection).join("")}
      </main>
    \`;
  }

  function renderLoading() {
    root.innerHTML = \`
      <main class="page-shell">
        <section class="loading-card">
          <span class="state-card__label">Loading</span>
          <h2>Refreshing Intelligence Desk</h2>
          <p>Pulling the latest snapshot now.</p>
        </section>
      </main>
    \`;
  }

  function renderConfigMessage() {
    root.innerHTML = \`
      <main class="page-shell">
        <section class="config-card">
          <span class="state-card__label">Setup Needed</span>
          <h2>Connect this block to a hosted snapshot</h2>
          <p>Replace the placeholder snapshot URL in this HTML once, then Circle can load fresh data automatically without repasting the whole block.</p>
          <code>\${escapeHtml(placeholderUrl)}</code>
        </section>
      </main>
    \`;
  }

  function renderError(error) {
    root.innerHTML = \`
      <main class="page-shell">
        <section class="error-card">
          <span class="state-card__label">Refresh Failed</span>
          <h2>Could not load the latest snapshot</h2>
          <p>\${escapeHtml(error && error.message ? error.message : "Unknown error")}</p>
          <code>\${escapeHtml(snapshotUrl)}</code>
        </section>
      </main>
    \`;
  }

  async function loadSnapshot() {
    if (!snapshotUrl || snapshotUrl === placeholderUrl) {
      renderConfigMessage();
      return;
    }

    renderLoading();

    try {
      const response = await fetch(snapshotUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Snapshot request returned HTTP " + response.status + ".");
      }

      const snapshot = await response.json();
      renderDesk(snapshot);
    } catch (error) {
      renderError(error);
    }
  }

  loadSnapshot();
  setInterval(loadSnapshot, refreshIntervalMs);
})();
  `.trim();
}

export interface CircleHtmlArtifact {
  customHtml: string;
  embedHtml: string;
}

export async function buildCircleHtml(): Promise<CircleHtmlArtifact> {
  const builtHtml = await readFile(distIndexPath, "utf8");
  const cssHref = extractCssHref(builtHtml);
  const cssPath = path.join(distDirectory, cssHref.replace(/^[/\\]+/u, ""));
  const css = await readFile(cssPath, "utf8");
  const scopedCss = scopeCssSelectors(css, ".ab-intelligence-desk");
  const customHtmlCss = `${scopedCss}${buildCustomHtmlOverrides()}`;
  const liveRendererScript = buildLiveRendererScript();

  const customHtml = [
    "<style>",
    customHtmlCss,
    "</style>",
    '<div class="ab-intelligence-desk" data-snapshot-url="https://YOUR-HOSTED-SNAPSHOT-URL/snapshot.json"></div>',
    "<script>",
    liveRendererScript,
    "</script>"
  ].join("");

  const embedHtml = builtHtml.replace(
    /<link rel="stylesheet" href="[^"]+">/u,
    `<style>${css}</style>`
  );

  return {
    customHtml,
    embedHtml
  };
}
