import {
  buildFetchFailure,
  buildFetchSuccess,
  defineSource,
  type ApprovedSourceDefinition,
  type SourceFetchContext
} from "../shared/source-result.ts";
import { fetchUrl } from "../shared/fetch-url.ts";
import { parseRss } from "../shared/parse-rss.ts";
import { summarizeText } from "../shared/normalize-html.ts";

export const openaiUpdatesSource = defineSource({
  key: "openai-news-rss",
  label: "OpenAI News",
  owner: "openai",
  sourceClass: "updates",
  transport: "rss",
  endpointUrl: "https://openai.com/news/rss.xml",
  canonicalUrl: "https://openai.com/news/",
  active: true,
  notes: "Official OpenAI news RSS feed used as the OpenAI updates source.",
  scope: { provider: "openai" },
  fetch: fetchOpenaiUpdates
});

export async function fetchOpenaiUpdates(
  source: ApprovedSourceDefinition,
  context: SourceFetchContext
) {
  const response = await fetchUrl({ url: source.endpointUrl, userAgent: context.userAgent });

  if (!response.ok) {
    return buildFetchFailure(source, context, {
      code: "http_error",
      message: `OpenAI news RSS returned HTTP ${response.status}.`,
      status: response.status
    });
  }

  const items = parseRss(response.body);

  return buildFetchSuccess(
    source,
    context,
    items.slice(0, 12).map((item) => ({
      externalId: item.guid ?? undefined,
      headline: item.title,
      summary: summarizeText(item.description ?? item.title, 200),
      sourceUrl: item.link,
      publishedAt: item.pubDate
    }))
  );
}
