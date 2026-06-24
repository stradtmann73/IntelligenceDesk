import type { DeskItem } from "../schema/item.ts";
import { cleanHeadlineText, cleanSourceSummary } from "../sources/shared/normalize-html.ts";

export interface DeskItemViewModel {
  headline: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  badgeLabel?: string;
  badgeKind?: "status" | "significance";
  cardKind?: "status" | "update" | "news";
  statusTone?: "stable" | "degraded" | "outage" | "recently-unstable";
  significanceTone?: "minor" | "notable" | "important" | "watch-closely";
  summaryPrefix?: string;
  sourcePrefix?: string;
}

export function mapItemToViewModel(item: DeskItem): DeskItemViewModel {
  const baseViewModel: DeskItemViewModel = {
    headline: cleanHeadlineText(item.headline),
    summary: cleanSourceSummary(item.summary),
    sourceName: cleanHeadlineText(item.source_name),
    sourceUrl: item.source_url,
    publishedAt: item.published_at,
    cardKind: item.item_type === "status" ? "status" : item.item_type === "update" ? "update" : "news",
    sourcePrefix: item.item_type === "news" ? "Read the source" : undefined
  };

  if (item.item_type === "status") {
    const statusToneMap = {
      Stable: "stable",
      Degraded: "degraded",
      Outage: "outage",
      "Recently unstable": "recently-unstable"
    } as const;

    return {
      ...baseViewModel,
      badgeLabel: item.status_label,
      badgeKind: "status",
      statusTone: statusToneMap[item.status_label]
    };
  }

  if (item.item_type === "update") {
    const significanceToneMap = {
      Minor: "minor",
      Notable: "notable",
      Important: "important",
      "Watch Closely": "watch-closely"
    } as const;

    return {
      ...baseViewModel,
      badgeLabel: item.significance_tag,
      badgeKind: "significance",
      significanceTone: significanceToneMap[item.significance_tag],
      summaryPrefix: "Plain-English takeaway"
    };
  }

  return baseViewModel;
}
