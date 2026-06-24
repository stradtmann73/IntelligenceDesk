import type { NewsTopicKey, RawSourceItem } from "../shared/source-result.ts";

const aiKeywords = [
  "ai",
  "artificial intelligence",
  "llm",
  "model",
  "models",
  "openai",
  "chatgpt",
  "anthropic",
  "claude",
  "gemini",
  "copilot",
  "chatbot",
  "generative",
  "inference",
  "data center",
  "semiconductor",
  "gpu"
];

const opinionKeywords = ["opinion", "column", "view", "analysis", "editorial"];
const investingKeywords = [
  "market",
  "stock",
  "stocks",
  "investor",
  "investors",
  "funding",
  "valuation",
  "earnings",
  "deal",
  "acquisition",
  "ipo",
  "capital",
  "revenue",
  "profit",
  "pricing",
  "price",
  "prices",
  "chip",
  "chips",
  "semiconductor"
];

const disallowedHeadlineFragments = [
  "subscribe",
  "sign in",
  "watch live",
  "menu",
  "search",
  "latest news",
  "skip to main content"
];

function buildHaystack(item: Pick<RawSourceItem, "headline" | "summary" | "sourceUrl">): string {
  return `${item.headline} ${item.summary ?? ""} ${item.sourceUrl}`.toLowerCase();
}

function hasKeyword(haystack: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => haystack.includes(keyword));
}

export function isAiNewsCandidate(item: Pick<RawSourceItem, "headline" | "summary" | "sourceUrl">): boolean {
  const headline = item.headline.trim();
  if (headline.length < 28 || headline.length > 180) {
    return false;
  }

  const haystack = buildHaystack(item);

  if (disallowedHeadlineFragments.some((fragment) => haystack.includes(fragment))) {
    return false;
  }

  return hasKeyword(haystack, aiKeywords);
}

export function isAiFinanceNewsCandidate(
  item: Pick<RawSourceItem, "headline" | "summary" | "sourceUrl">
): boolean {
  if (!isAiNewsCandidate(item)) {
    return false;
  }

  return hasKeyword(buildHaystack(item), investingKeywords);
}

export function routeNewsTopic(item: RawSourceItem): NewsTopicKey {
  const haystack = buildHaystack(item);

  if (hasKeyword(haystack, opinionKeywords)) {
    return "opinion";
  }

  if (hasKeyword(haystack, investingKeywords)) {
    return "investing_and_finance";
  }

  return "business_general";
}
