export interface ExtractedAnchorLink {
  headline: string;
  sourceUrl: string;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#(\d+);/g, (_match, codePoint) => String.fromCharCode(Number(codePoint)));
}

function stripNonContentBlocks(input: string): string {
  return input
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
}

export function stripHtmlTags(input: string): string {
  return decodeHtmlEntities(stripNonContentBlocks(input)).replace(/<[^>]+>/g, " ");
}

export function normalizeWhitespace(input: string): string {
  return stripHtmlTags(input).replace(/\s+/g, " ").trim();
}

export function summarizeText(input: string, maxLength = 280): string {
  const normalized = normalizeWhitespace(input);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const ellipsis = "...";
  const sliceLength = Math.max(0, maxLength - ellipsis.length);
  return `${normalized.slice(0, sliceLength).trimEnd()}${ellipsis}`;
}

export function extractRelevantWindow(
  input: string,
  cues: string[],
  maxLength = 600
): string {
  const normalized = normalizeWhitespace(input);
  const lower = normalized.toLowerCase();

  let matchIndex = -1;
  for (const cue of cues) {
    const candidateIndex = lower.indexOf(cue.toLowerCase());
    if (candidateIndex !== -1 && (matchIndex === -1 || candidateIndex < matchIndex)) {
      matchIndex = candidateIndex;
    }
  }

  const sliced = matchIndex === -1
    ? normalized
    : normalized.slice(matchIndex, matchIndex + Math.max(maxLength * 2, 1200));

  return summarizeText(sliced, maxLength);
}

export function extractAnchorLinks(
  html: string,
  baseUrl: string,
  limit = 30
): ExtractedAnchorLink[] {
  const links: ExtractedAnchorLink[] = [];
  const seen = new Set<string>();
  const anchorPattern = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const href = match[1]?.trim();
    const text = normalizeWhitespace(match[2] ?? "");

    if (!href || !text) {
      continue;
    }

    let sourceUrl: string;
    try {
      sourceUrl = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }

    const dedupeKey = `${text.toLowerCase()}|${sourceUrl}`;
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    links.push({
      headline: text,
      sourceUrl
    });

    if (links.length >= limit) {
      break;
    }
  }

  return links;
}
