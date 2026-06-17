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

export function isAiNewsCandidate(item: Pick<RawSourceItem, "headline" | "summary" | "sourceUrl">): boolean {
  const headline = item.headline.trim();
  if (headline.length < 28 || headline.length > 180) {
    return false;
  }

  const haystack = buildHaystack(item);

  if (disallowedHeadlineFragments.some((fragment) => haystack.includes(fragment))) {
    return false;
  }

  return aiKeywords.some((keyword) => haystack.includes(keyword));
}

export function routeNewsTopic(item: RawSourceItem): NewsTopicKey {
  const haystack = buildHaystack(item);

  if (opinionKeywords.some((keyword) => haystack.includes(keyword))) {
    return "opinion";
  }

  if (investingKeywords.some((keyword) => haystack.includes(keyword))) {
    return "investing_and_finance";
  }

  return "business_general";
}
