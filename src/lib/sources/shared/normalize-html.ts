export interface ExtractedAnchorLink {
  headline: string;
  sourceUrl: string;
}

const mojibakePattern =
  /(?:Ãƒ.|Ã‚.|Ã¢â‚¬â„¢|Ã¢â‚¬Å“|Ã¢â‚¬Â|Ã¢â‚¬â€œ|Ã¢â‚¬â€|Ã¢â‚¬Â¦|Ã¯Â¿Â½|â€™|â€œ|â€|â€“|â€”|â€¦)/u;

const mojibakeGlobalPattern =
  /(?:Ãƒ.|Ã‚.|Ã¢â‚¬â„¢|Ã¢â‚¬Å“|Ã¢â‚¬Â|Ã¢â‚¬â€œ|Ã¢â‚¬â€|Ã¢â‚¬Â¦|Ã¯Â¿Â½|â€™|â€œ|â€|â€“|â€”|â€¦)/gu;

function looksMojibake(input: string): boolean {
  return mojibakePattern.test(input);
}

function scoreReadableText(input: string): number {
  const suspicious = (input.match(mojibakeGlobalPattern) ?? []).length;
  const asciiWords = (input.match(/[A-Za-z]{3,}/g) ?? []).length;
  return asciiWords - suspicious * 4;
}

export function repairMojibake(input: string): string {
  if (!looksMojibake(input)) {
    return input;
  }

  try {
    const bytes = Uint8Array.from([...input].map((char) => char.charCodeAt(0) & 0xff));
    const repaired = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return scoreReadableText(repaired) > scoreReadableText(input) ? repaired : input;
  } catch {
    return input;
  }
}

function decodeHtmlEntities(input: string): string {
  return repairMojibake(input)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&ldquo;/gi, "\"")
    .replace(/&rdquo;/gi, "\"")
    .replace(/&mdash;/gi, "\u2014")
    .replace(/&ndash;/gi, "\u2013")
    .replace(/&hellip;/gi, "...")
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
  return repairMojibake(stripHtmlTags(input))
    .replace(/Ã¢â‚¬â„¢|â€™/g, "'")
    .replace(/Ã¢â‚¬Å“|Ã¢â‚¬Â|â€œ|â€/g, "\"")
    .replace(/Ã¢â‚¬â€œ|â€“/g, "-")
    .replace(/Ã¢â‚¬â€|â€”/g, "--")
    .replace(/â€¦/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractTitleTag(input: string): string | null {
  const match = input.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? normalizeWhitespace(match[1]) : null;
}

export function extractMetaContent(input: string, keys: string[]): string | null {
  for (const key of keys) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const directMatch = input.match(
      new RegExp(
        `<meta[^>]+(?:name|property)=["']${escapedKey}["'][^>]+content=["']([^"']*)["'][^>]*>`,
        "i"
      )
    );

    if (directMatch) {
      return normalizeWhitespace(directMatch[1]);
    }

    const reverseMatch = input.match(
      new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escapedKey}["'][^>]*>`,
        "i"
      )
    );

    if (reverseMatch) {
      return normalizeWhitespace(reverseMatch[1]);
    }
  }

  return null;
}

export function stripMarkdownDecorators(input: string): string {
  return normalizeWhitespace(input)
    .replace(/[*_#`]+/g, " ")
    .replace(/\\-/g, "-")
    .replace(/\s+/g, " ")
    .trim();
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

export function cleanSourceSummary(input: string): string {
  return stripMarkdownDecorators(input)
    .replace(/\b(skip to main content|documentation index|subscribe to updates?)\b/gi, "")
    .replace(/\b(get email notifications|resend otp|enter otp)\b.*$/i, "")
    .replace(/\b(english|deutsch|italiano|portugues|espanol|francais|japanese|korean)\b.*$/i, "")
    .replace(/\b(privacy policy|terms of service)\b.*$/i, "")
    .replace(/\b(affected components?|symptoms|workaround)\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
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

export function extractStatusWindow(
  input: string,
  cues: string[],
  fallback: string,
  maxLength = 320
): string {
  const window = extractRelevantWindow(input, cues, maxLength);
  const cleaned = cleanSourceSummary(window);

  return cleaned.length >= 30 ? cleaned : fallback;
}

export function cleanHeadlineText(input: string): string {
  return normalizeWhitespace(input)
    .replace(/\b(skip to main content|documentation index)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
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
