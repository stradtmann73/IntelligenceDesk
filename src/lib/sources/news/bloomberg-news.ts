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

export const bloombergNewsSource = defineSource({
  key: "bloomberg-ai-news",
  label: "Bloomberg AI",
  owner: "bloomberg",
  sourceClass: "news",
  transport: "html",
  endpointUrl: "https://www.bloomberg.com/ai",
  canonicalUrl: "https://www.bloomberg.com/ai",
  active: true,
  notes: "Bloomberg AI topic page for business and investing coverage tied to AI.",
  scope: { topic: "investing_and_finance" },
  fetch: fetchBloombergNews
});

function toRawItems(source: ApprovedSourceDefinition, html: string): RawSourceItem[] {
  return extractAnchorLinks(html, source.canonicalUrl, 80)
    .map((link) => ({
      headline: link.headline,
      summary: summarizeText(link.headline, 180),
      sourceUrl: link.sourceUrl
    }))
    .filter(isAiNewsCandidate)
    .slice(0, 12);
}

export async function fetchBloombergNews(
  source: ApprovedSourceDefinition,
  context: SourceFetchContext
) {
  const response = await fetchUrl({ url: source.endpointUrl, userAgent: context.userAgent });

  if (!response.ok) {
    return buildFetchFailure(source, context, {
      code: "http_error",
      message: `Bloomberg AI returned HTTP ${response.status}.`,
      status: response.status
    });
  }

  return buildFetchSuccess(source, context, toRawItems(source, response.body));
}
