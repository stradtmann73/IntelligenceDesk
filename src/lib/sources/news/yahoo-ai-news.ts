import {
  buildFetchFailure,
  buildFetchSuccess,
  defineSource,
  type ApprovedSourceDefinition,
  type RawSourceItem,
  type SourceFetchContext
} from "../shared/source-result.ts";
import { fetchUrl } from "../shared/fetch-url.ts";
import { extractAnchorLinks, summarizeText } from "../shared/normalize-html.ts";
import { isAiNewsCandidate } from "./topic-routing.ts";

export const yahooAiNewsSource = defineSource({
  key: "yahoo-ai-news",
  label: "Yahoo Tech AI",
  owner: "yahoo",
  sourceClass: "news",
  transport: "html",
  endpointUrl: "https://tech.yahoo.com/ai/",
  canonicalUrl: "https://tech.yahoo.com/ai/",
  active: true,
  notes: "Yahoo Tech AI page for broader consumer and business AI coverage.",
  scope: { topic: "business_general" },
  fetch: fetchYahooAiNews
});

function toRawItems(source: ApprovedSourceDefinition, html: string): RawSourceItem[] {
  return extractAnchorLinks(html, source.canonicalUrl, 100)
    .map((link) => ({
      headline: link.headline,
      summary: summarizeText(link.headline, 180),
      sourceUrl: link.sourceUrl
    }))
    .filter(isAiNewsCandidate)
    .slice(0, 12);
}

export async function fetchYahooAiNews(
  source: ApprovedSourceDefinition,
  context: SourceFetchContext
) {
  const response = await fetchUrl({ url: source.endpointUrl, userAgent: context.userAgent });

  if (!response.ok) {
    return buildFetchFailure(source, context, {
      code: "http_error",
      message: `Yahoo Tech AI returned HTTP ${response.status}.`,
      status: response.status
    });
  }

  return buildFetchSuccess(source, context, toRawItems(source, response.body));
}
