import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "../../..");
const distDirectory = path.join(projectRoot, "dist");
const distIndexPath = path.join(distDirectory, "index.html");
const hostedSnapshotUrl = "https://stradtmann73.github.io/IntelligenceDesk/snapshot.json";
const hostedPreviewUrl = "https://stradtmann73.github.io/IntelligenceDesk/circle-preview.html";

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

function prettyPrintCss(css: string): string {
  return css
    .replace(/\}/g, "}\n")
    .replace(/\{/g, " {\n  ")
    .replace(/;/g, ";\n  ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

function buildCustomHtmlOverrides(): string {
  return [
    ".ab-intelligence-desk{min-height:auto!important;margin:0!important;padding:0!important;background:transparent!important;}",
    ".ab-intelligence-desk .skip-link{display:none!important;}",
    ".ab-intelligence-desk .page-shell{box-sizing:border-box!important;max-width:1200px!important;width:100%!important;margin:0 auto!important;padding:20px!important;gap:24px!important;}",
    ".ab-intelligence-desk .intro-shell,.ab-intelligence-desk .section-shell{padding:16px!important;}",
    ".ab-intelligence-desk .intro-shell__headline{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(280px,320px)!important;align-items:start!important;gap:24px!important;}",
    ".ab-intelligence-desk .intro-shell__headline>*{min-width:0!important;}",
    ".ab-intelligence-desk .intro-shell h1{max-width:14ch!important;word-break:normal!important;overflow-wrap:normal!important;}",
    ".ab-intelligence-desk .intro-shell__lede,.ab-intelligence-desk .intro-shell__guidance p,.ab-intelligence-desk .section-shell__header p,.ab-intelligence-desk .item-card__summary{word-break:normal!important;overflow-wrap:anywhere!important;}",
    ".ab-intelligence-desk .freshness-card{width:100%!important;max-width:320px!important;justify-self:end!important;}",
    ".ab-intelligence-desk .section-grid{align-items:start;}",
    ".ab-intelligence-desk .state-card__label{white-space:nowrap;}",
    ".ab-intelligence-desk .loading-card,.ab-intelligence-desk .error-card{display:grid;gap:12px;padding:16px;border:1px solid var(--color-line);border-radius:var(--radius-lg);background:var(--color-surface);}",
    ".ab-intelligence-desk .config-card{display:grid;gap:10px;padding:16px;border:1px dashed var(--color-line);border-radius:var(--radius-lg);background:var(--color-surface-alt);}",
    ".ab-intelligence-desk .config-card code,.ab-intelligence-desk .error-card code{word-break:break-all;}",
    "@media(max-width:1100px){.ab-intelligence-desk .intro-shell__headline{grid-template-columns:1fr!important;}.ab-intelligence-desk .freshness-card{justify-self:start!important;max-width:none!important;}}",
    "@media(max-width:960px){.ab-intelligence-desk .section-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;}}",
    "@media(max-width:840px){.ab-intelligence-desk .section-grid{grid-template-columns:1fr!important;}}",
    "@media(max-width:720px){.ab-intelligence-desk .page-shell{padding:16px!important;gap:16px!important;}.ab-intelligence-desk .intro-shell h1{font-size:2rem!important;line-height:1.08!important;max-width:none!important;}.ab-intelligence-desk .intro-shell__lede{font-size:1rem!important;line-height:1.55!important;}}",
    "@media(max-width:540px){.ab-intelligence-desk .page-shell{padding:12px!important;}.ab-intelligence-desk .intro-shell,.ab-intelligence-desk .section-shell,.ab-intelligence-desk .column-card__header,.ab-intelligence-desk .column-card__body,.ab-intelligence-desk .item-card,.ab-intelligence-desk .empty-state-card,.ab-intelligence-desk .stale-state-card{padding:12px!important;}.ab-intelligence-desk .intro-shell,.ab-intelligence-desk .section-shell{gap:14px!important;}.ab-intelligence-desk .intro-shell__headline{gap:12px!important;}.ab-intelligence-desk .freshness-card{padding:12px!important;}.ab-intelligence-desk .item-card__actions{gap:8px!important;}.ab-intelligence-desk .item-card__source-link{width:100%!important;}}"
  ].join("");
}

function buildLiveRendererScript(bootstrapSnapshot: string): string {
  return String.raw`
(function () {
  const root = document.currentScript.previousElementSibling;
  if (!root) return;

  const placeholderUrl = "https://YOUR-HOSTED-SNAPSHOT-URL/snapshot.json";
  const bootstrapSnapshot = ${bootstrapSnapshot};
  const useBootstrapSnapshot = window.location.protocol === "file:";
  const snapshotUrl = useBootstrapSnapshot ? "" : (root.dataset.snapshotUrl || placeholderUrl);
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

  function cleanText(value) {
    return String(value ?? "")
      .replace(/â€™/g, "'")
      .replace(/â€œ|â€/g, '"')
      .replace(/Â·/g, "·")
      .replace(/Â/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function sanitizeHeadline(item) {
    const rawHeadline = cleanText(item.headline);

    if (/status snapshot/i.test(rawHeadline)) {
      return item.provider_or_topic
        ? String(item.provider_or_topic).charAt(0).toUpperCase() + String(item.provider_or_topic).slice(1) + " status"
        : "Current status";
    }

    if (/release notes snapshot/i.test(rawHeadline)) {
      return item.provider_or_topic
        ? String(item.provider_or_topic).charAt(0).toUpperCase() + String(item.provider_or_topic).slice(1) + " release notes"
        : "Release notes";
    }

    if (/what's new snapshot/i.test(rawHeadline)) {
      return "What's new";
    }

    return rawHeadline;
  }

  function sanitizeSummary(item) {
    let text = cleanText(item.summary);
    text = text
      .replace(/^Official status read:\s*/i, "")
      .replace(/^Plain-English takeaway:\s*/i, "")
      .replace(/^Why it matters:\s*/i, "")
      .replace(/Subscribe to updates?/gi, "")
      .replace(/Subscribe x/gi, "")
      .replace(/Get email notifications.*$/i, "")
      .replace(/Skip to main content/gi, "")
      .replace(/Documentation Index.*$/i, "")
      .replace(/This page provides status information[^.]*\./i, "")
      .replace(/Check back here to view[^.]*\./i, "")
      .replace(/English\s+Fran.*$/i, "")
      .replace(/API Docs Release Notes.*$/i, "")
      .replace(/We’re currently experiencing issues/i, "Current issue:")
      .replace(/We're currently experiencing issues/i, "Current issue:")
      .replace(/\s+/g, " ")
      .trim();

    if (item.item_type === "status") {
      if (/degraded performance/i.test(text)) {
        text = text.replace(/Investigating.*$/i, "").trim();
      }

      if (/^Current issue:/i.test(text)) {
        return text;
      }

      if (!text || text.length < 30) {
        return item.status_label === "Stable"
          ? "No active issue is visible on the official provider status page in this snapshot."
          : "The provider status page indicates an active issue or degraded service in this snapshot.";
      }
    }

    if (item.item_type === "update" && !text) {
      return "Official provider update captured in this snapshot.";
    }

    if (item.item_type === "news" && !text) {
      return "Relevant AI business coverage surfaced in this snapshot.";
    }

    return text;
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
    return \`
      <p class="item-card__source-forward">
        <span class="item-card__source-prefix">Source:</span>
        <span>\${escapeHtml(cleanText(item.source_name))}</span>
      </p>
    \`;
  }

  function renderSummary(item) {
    const summary = sanitizeSummary(item);
    if (item.item_type === "update") {
      return \`<p class="item-card__summary"><span class="item-card__summary-prefix">What changed:</span> \${escapeHtml(summary)}</p>\`;
    }

    if (item.item_type === "news") {
      return \`<p class="item-card__summary">\${escapeHtml(summary)}</p>\`;
    }

    return \`<p class="item-card__summary">\${escapeHtml(summary)}</p>\`;
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
          <a href="\${escapeHtml(item.source_url)}" target="_blank" rel="noreferrer">\${escapeHtml(sanitizeHeadline(item))}</a>
        </h4>
        \${renderSourceForward(item)}
        \${renderSummary(item)}
        <div class="item-card__actions">
          <a class="item-card__source-link" href="\${escapeHtml(item.source_url)}" target="_blank" rel="noreferrer">Open source</a>
          <span class="item-card__source-meta">\${escapeHtml(cleanText(item.source_name))}</span>
        </div>
        <div class="item-card__footer">
          <div class="metadata-row">
            <span class="metadata-pill">
              <span class="metadata-pill__label">Source</span>
              <a href="\${escapeHtml(item.source_url)}" target="_blank" rel="noreferrer">\${escapeHtml(cleanText(item.source_name))}</a>
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
            <p><strong>Start here:</strong> Check "LLM Status" when a tool feels off, "LLM/Model Updates" when something new lands, and "News" when you want the broader market read.</p>
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
    if (useBootstrapSnapshot && bootstrapSnapshot) {
      renderDesk(bootstrapSnapshot);
      return;
    }

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
  if (!useBootstrapSnapshot) {
    setInterval(loadSnapshot, refreshIntervalMs);
  }
})();
  `.trim();
}

export interface CircleHtmlArtifact {
  customHtml: string;
  embedHtml: string;
  previewHtml: string;
}

export async function buildCircleHtml(): Promise<CircleHtmlArtifact> {
  const builtHtml = await readFile(distIndexPath, "utf8");
  const cssHref = extractCssHref(builtHtml);
  const cssPath = path.join(distDirectory, cssHref.replace(/^[/\\]+/u, ""));
  const snapshotPath = path.join(projectRoot, "data", "current", "snapshot.json");
  const css = await readFile(cssPath, "utf8");
  const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
  const scopedCss = scopeCssSelectors(css, ".ab-intelligence-desk");
  const customHtmlCss = prettyPrintCss(`${scopedCss}\n${buildCustomHtmlOverrides()}`);
  const previewRendererScript = buildLiveRendererScript(JSON.stringify(snapshot));

  const customHtml = [
    "<style>",
    [
      ".ab-intelligence-desk-frame{width:100%;max-width:1200px;margin:0 auto;}",
      ".ab-intelligence-desk-frame iframe{display:block;width:100%;min-height:3200px;border:0;border-radius:20px;background:#fff;}",
      "@media(max-width:840px){.ab-intelligence-desk-frame iframe{min-height:4200px;}}",
      "@media(max-width:540px){.ab-intelligence-desk-frame iframe{min-height:5200px;}}"
    ].join(""),
    "</style>",
    [
      '<div class="ab-intelligence-desk-frame">',
      `<iframe src="${hostedPreviewUrl}" title="Intelligence Desk" loading="lazy"></iframe>`,
      "</div>"
    ].join("")
  ].join("");

  const previewHtml = [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>Circle Preview</title>",
    "</head>",
    "<body>",
    "<style>",
    customHtmlCss,
    "body{margin:0;padding:24px;background:#f6f4ef;font-family:\"Source Sans 3\",sans-serif;}",
    "</style>",
    `<div class="ab-intelligence-desk" data-snapshot-url="${hostedSnapshotUrl}"></div>`,
    "<script>",
    previewRendererScript,
    "</script>",
    "</body>",
    "</html>"
  ].join("");

  const embedHtml = builtHtml.replace(
    /<link rel="stylesheet" href="[^"]+">/u,
    `<style>${css}</style>`
  );

  return {
    customHtml,
    embedHtml,
    previewHtml
  };
}
