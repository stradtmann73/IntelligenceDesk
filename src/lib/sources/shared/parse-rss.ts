export interface ParsedRssItem {
  title: string;
  link: string;
  pubDate: string | null;
  description: string | null;
  guid: string | null;
}

function decodeXmlText(value: string): string {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function matchTag(block: string, tagName: string): string | null {
  const match = block.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "i"));
  return match ? decodeXmlText(match[1].trim()) : null;
}

export function parseRss(xml: string): ParsedRssItem[] {
  const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];

  return itemBlocks.map((block) => ({
    title: matchTag(block, "title") ?? "Untitled item",
    link: matchTag(block, "link") ?? "",
    pubDate: matchTag(block, "pubDate"),
    description: matchTag(block, "description"),
    guid: matchTag(block, "guid")
  }));
}
