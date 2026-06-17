import type { CandidateItem, CandidateNewsItem, CandidateStatusItem, CandidateUpdateItem } from "./normalize-stage.ts";
import type { DeskItem, NewsItem, SignificanceTag, StatusItem, StatusLabel, UpdateItem } from "../schema/item.ts";

function buildTextHaystack(item: CandidateItem): string {
  return `${item.headline} ${item.summary} ${item.source_name}`.toLowerCase();
}

function inferStatusLabel(item: CandidateStatusItem): StatusLabel {
  const haystack = buildTextHaystack(item);

  if (
    haystack.includes("outage") ||
    haystack.includes("unavailable") ||
    haystack.includes("major incident") ||
    haystack.includes("down")
  ) {
    return "Outage";
  }

  if (
    haystack.includes("degraded") ||
    haystack.includes("latency") ||
    haystack.includes("elevated errors") ||
    haystack.includes("performance issue") ||
    haystack.includes("investigating")
  ) {
    return "Degraded";
  }

  if (
    haystack.includes("recent") ||
    haystack.includes("history") ||
    haystack.includes("resolved") ||
    haystack.includes("last verified")
  ) {
    return "Recently unstable";
  }

  return "Stable";
}

function inferSignificanceTag(item: CandidateUpdateItem): SignificanceTag {
  const haystack = buildTextHaystack(item);

  if (
    haystack.includes("retire") ||
    haystack.includes("sunset") ||
    haystack.includes("watch closely") ||
    haystack.includes("migration") ||
    haystack.includes("breaking")
  ) {
    return "Watch Closely";
  }

  if (
    haystack.includes("launch") ||
    haystack.includes("introducing") ||
    haystack.includes("new model") ||
    haystack.includes("major") ||
    haystack.includes("capability") ||
    haystack.includes("release notes")
  ) {
    return "Important";
  }

  if (
    haystack.includes("update") ||
    haystack.includes("improve") ||
    haystack.includes("preview") ||
    haystack.includes("rollout") ||
    haystack.includes("changelog")
  ) {
    return "Notable";
  }

  return "Minor";
}

function classifyStatusItem(item: CandidateStatusItem): StatusItem {
  return {
    ...item,
    status_label: inferStatusLabel(item)
  };
}

function classifyUpdateItem(item: CandidateUpdateItem): UpdateItem {
  return {
    ...item,
    significance_tag: inferSignificanceTag(item)
  };
}

function classifyNewsItem(item: CandidateNewsItem): NewsItem {
  return item;
}

export function classifyCandidateItem(item: CandidateItem): DeskItem {
  if (item.item_type === "status") {
    return classifyStatusItem(item);
  }

  if (item.item_type === "update") {
    return classifyUpdateItem(item);
  }

  return classifyNewsItem(item);
}

export function runClassifyStage(items: CandidateItem[]): DeskItem[] {
  return items.map(classifyCandidateItem);
}
