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

export const techcrunchNewsSource = defineSource({
  key: "techcrunch-ai-news",
  label: "TechCrunch AI",
  owner: "techcrunch",
  sourceClass: "news",
  transport: "html",
  endpointUrl: "https://techcrunch.com/category/artificial-intelligence/",
  canonicalUrl: "https://techcrunch.com/category/artificial-intelligence/",
  active: true,
  notes: "TechCrunch AI category page for startup, product, and ecosystem coverage.",
  scope: { topic: "business_general" },
  fetch: fetchTechCrunchNews
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

export async function fetchTechCrunchNews(
  source: ApprovedSourceDefinition,
  context: SourceFetchContext
) {
  const response = await fetchUrl({ url: source.endpointUrl, userAgent: context.userAgent });

  if (!response.ok) {
    return buildFetchFailure(source, context, {
      code: "http_error",
      message: `TechCrunch AI returned HTTP ${response.status}.`,
      status: response.status
    });
  }

  return buildFetchSuccess(source, context, toRawItems(source, response.body));
}
