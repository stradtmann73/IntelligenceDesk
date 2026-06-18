import {
  buildFetchFailure,
  buildFetchSuccess,
  defineSource,
  type ApprovedSourceDefinition,
  type SourceFetchContext
} from "../shared/source-result.ts";
import { fetchUrl } from "../shared/fetch-url.ts";
import { cleanHeadlineText, cleanSourceSummary, summarizeText } from "../shared/normalize-html.ts";
import { parseRss } from "../shared/parse-rss.ts";

export const claudeStatusSource = defineSource({
  key: "claude-status",
  label: "Claude Status",
  owner: "anthropic",
  sourceClass: "status",
  transport: "rss",
  endpointUrl: "https://status.claude.com/history.rss",
  canonicalUrl: "https://status.claude.com/",
  active: true,
  notes: "Official Anthropic incident history feed.",
  scope: { provider: "claude" },
  fetch: fetchClaudeStatus
});

export async function fetchClaudeStatus(
  source: ApprovedSourceDefinition,
  context: SourceFetchContext
) {
  const response = await fetchUrl({ url: source.endpointUrl, userAgent: context.userAgent });

  if (!response.ok) {
    return buildFetchFailure(source, context, {
      code: "http_error",
      message: `Claude status returned HTTP ${response.status}.`,
      status: response.status
    });
  }

  const items = parseRss(response.body);
  const latestItem = items[0];

  if (!latestItem) {
    return buildFetchSuccess(source, context, [
      {
        headline: "Claude status",
        summary: "No active issue is visible on the official Claude status feed in this snapshot.",
        sourceUrl: source.canonicalUrl
      }
    ]);
  }

  const description = cleanSourceSummary(latestItem.description ?? "");
  const strongestStatus =
    description.match(/\b(Investigating|Identified|Monitoring|Resolved)\b/i)?.[1] ?? "";
  const detail = description
    .replace(/^[A-Z][a-z]{2}\s+\d{1,2}\s*,\s*\d{1,2}:\d{2}\s+UTC\s*/i, "")
    .replace(/\b(Investigating|Identified|Monitoring|Resolved)\b\s*-\s*/i, "")
    .replace(/[A-Z][a-z]{2}\s+\d{1,2}\s*,\s*\d{1,2}:\d{2}\s+UTC.*$/i, "")
    .trim();

  return buildFetchSuccess(source, context, [
    {
      headline: cleanHeadlineText(latestItem.title || "Claude status"),
      summary: summarizeText(
        [strongestStatus ? `Status: ${strongestStatus}.` : "", detail].filter(Boolean).join(" "),
        220
      ) || "No active issue is visible on the official Claude status feed in this snapshot.",
      sourceUrl: latestItem.link || source.canonicalUrl,
      publishedAt: latestItem.pubDate,
      rawText: latestItem.description ?? response.body
    }
  ]);
}
