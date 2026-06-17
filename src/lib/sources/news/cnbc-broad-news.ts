import {
  buildFetchFailure,
  buildFetchSuccess,
  defineSource,
  type ApprovedSourceDefinition,
  type RawSourceItem,
  type SourceFetchContext
} from "../shared/source-result.ts";
import { fetchUrl } from "../shared/fetch-url.ts";
import { parseRss } from "../shared/parse-rss.ts";
import { summarizeText } from "../shared/normalize-html.ts";
import { isAiNewsCandidate } from "./topic-routing.ts";

export const cnbcBroadNewsSource = defineSource({
  key: "cnbc-broad-news",
  label: "CNBC Business AI",
  owner: "cnbc",
  sourceClass: "news",
  transport: "rss",
  endpointUrl: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147",
  canonicalUrl: "https://www.cnbc.com/ai-artificial-intelligence/",
  active: true,
  notes: "Broader CNBC RSS feed filtered down to AI-relevant items only.",
  scope: { topic: "investing_and_finance" },
  fetch: fetchCnbcBroadNews
});

function toRawItems(items: ReturnType<typeof parseRss>): RawSourceItem[] {
  return items
    .map((item) => ({
      externalId: item.guid ?? undefined,
      headline: item.title,
      summary: summarizeText(item.description ?? item.title, 200),
      sourceUrl: item.link,
      publishedAt: item.pubDate
    }))
    .filter(isAiNewsCandidate)
    .slice(0, 12);
}

export async function fetchCnbcBroadNews(
  source: ApprovedSourceDefinition,
  context: SourceFetchContext
) {
  const response = await fetchUrl({ url: source.endpointUrl, userAgent: context.userAgent });

  if (!response.ok) {
    return buildFetchFailure(source, context, {
      code: "http_error",
      message: `CNBC broad RSS returned HTTP ${response.status}.`,
      status: response.status
    });
  }

  const items = parseRss(response.body);
  return buildFetchSuccess(source, context, toRawItems(items));
}
