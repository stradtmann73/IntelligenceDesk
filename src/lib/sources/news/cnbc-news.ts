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

export const cnbcNewsSource = defineSource({
  key: "cnbc-ai-news",
  label: "CNBC AI",
  owner: "cnbc",
  sourceClass: "news",
  transport: "rss",
  endpointUrl: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=19854910",
  canonicalUrl: "https://www.cnbc.com/ai-artificial-intelligence/",
  active: true,
  notes: "CNBC AI RSS feed for operator-relevant business and investing coverage.",
  scope: { topic: "business_general" },
  fetch: fetchCnbcNews
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

export async function fetchCnbcNews(
  source: ApprovedSourceDefinition,
  context: SourceFetchContext
) {
  const response = await fetchUrl({ url: source.endpointUrl, userAgent: context.userAgent });

  if (!response.ok) {
    return buildFetchFailure(source, context, {
      code: "http_error",
      message: `CNBC AI RSS returned HTTP ${response.status}.`,
      status: response.status
    });
  }

  const items = parseRss(response.body);
  return buildFetchSuccess(source, context, toRawItems(items));
}
