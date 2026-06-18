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

export const openaiStatusSource = defineSource({
  key: "openai-status",
  label: "OpenAI Status",
  owner: "openai",
  sourceClass: "status",
  transport: "rss",
  endpointUrl: "https://status.openai.com/feed.rss",
  canonicalUrl: "https://status.openai.com/",
  active: true,
  notes: "Official provider status feed for OpenAI services.",
  scope: { provider: "openai" },
  fetch: fetchOpenaiStatus
});

export async function fetchOpenaiStatus(
  source: ApprovedSourceDefinition,
  context: SourceFetchContext
) {
  const response = await fetchUrl({ url: source.endpointUrl, userAgent: context.userAgent });

  if (!response.ok) {
    return buildFetchFailure(source, context, {
      code: "http_error",
      message: `OpenAI status returned HTTP ${response.status}.`,
      status: response.status
    });
  }

  const items = parseRss(response.body);
  const activeItem = items.find((item) => /status:\s*(investigating|identified|monitoring|degraded)/i.test(item.description ?? ""));
  const latestItem = activeItem ?? items[0];

  if (!latestItem) {
    return buildFetchSuccess(source, context, [
      {
        headline: "OpenAI status",
        summary: "No active issue is visible on the official OpenAI status feed in this snapshot.",
        sourceUrl: source.canonicalUrl
      }
    ]);
  }

  const statusText = cleanSourceSummary(
    latestItem.description?.match(/Status:\s*([^<\n]+)/i)?.[1] ?? ""
  );
  const summaryText = cleanSourceSummary(latestItem.description ?? "")
    .replace(/^Status:\s*[^.]+\.\s*/i, "")
    .replace(/^Status:\s*[^.]+/i, "")
    .trim();

  return buildFetchSuccess(source, context, [
    {
      headline: cleanHeadlineText(latestItem.title || "OpenAI status"),
      summary: summarizeText(
        [statusText ? `Status: ${statusText}.` : "", summaryText].filter(Boolean).join(" "),
        220
      ) || "No active issue is visible on the official OpenAI status feed in this snapshot.",
      sourceUrl: latestItem.link || source.canonicalUrl,
      publishedAt: latestItem.pubDate,
      rawText: latestItem.description ?? response.body
    }
  ]);
}
