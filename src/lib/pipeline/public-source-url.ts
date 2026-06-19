function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isMachineReadablePathname(pathname: string): boolean {
  if (/\.(atom|json|rss|xml)$/iu.test(pathname)) {
    return true;
  }

  const segments = pathname
    .toLowerCase()
    .split("/")
    .filter(Boolean);
  const lastSegment = segments.at(-1);

  return lastSegment === "atom" || lastSegment === "feed" || lastSegment === "json" || lastSegment === "rss" || lastSegment === "xml";
}

function isMachineReadableSearchParam(key: string, value: string): boolean {
  const normalizedKey = key.toLowerCase();
  const normalizedValue = value.toLowerCase();

  if (
    (normalizedKey === "alt" || normalizedKey === "format" || normalizedKey === "output") &&
    (normalizedValue === "atom" || normalizedValue === "json" || normalizedValue === "rss" || normalizedValue === "xml")
  ) {
    return true;
  }

  return /\.(atom|json|rss|xml)\b/iu.test(normalizedValue);
}

export function isMachineReadableSourceUrl(value: string): boolean {
  const parsed = parseUrl(value);
  if (!parsed) {
    return false;
  }

  if (isMachineReadablePathname(parsed.pathname)) {
    return true;
  }

  for (const [key, paramValue] of parsed.searchParams.entries()) {
    if (isMachineReadableSearchParam(key, paramValue)) {
      return true;
    }
  }

  return false;
}

export function toPublicSourceUrl(sourceUrl: string, canonicalUrl: string): string {
  const parsed = parseUrl(sourceUrl);
  if (!parsed) {
    return sourceUrl;
  }

  return isMachineReadableSourceUrl(parsed.toString()) ? canonicalUrl : parsed.toString();
}
