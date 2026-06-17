import type { DeskItem } from "../schema/item.ts";

export type ForceReviewReason =
  | "watch_closely_tag"
  | "headline_only_summary"
  | "source_delayed_language"
  | "summary_too_thin";

export interface ForceReviewDecision {
  forceReview: boolean;
  reasons: ForceReviewReason[];
}

function normalizedText(item: DeskItem): string {
  return `${item.headline} ${item.summary}`.toLowerCase();
}

export function evaluateForceReview(item: DeskItem): ForceReviewDecision {
  const reasons: ForceReviewReason[] = [];
  const text = normalizedText(item);

  if (item.item_type === "update" && item.significance_tag === "Watch Closely") {
    reasons.push("watch_closely_tag");
  }

  if (item.summary.trim() === item.headline.trim()) {
    reasons.push("headline_only_summary");
  }

  if (item.summary.trim().split(/\s+/u).length < 8) {
    reasons.push("summary_too_thin");
  }

  if (
    text.includes("last verified") ||
    text.includes("source check delayed") ||
    text.includes("verification delayed")
  ) {
    reasons.push("source_delayed_language");
  }

  return {
    forceReview: reasons.length > 0,
    reasons
  };
}
