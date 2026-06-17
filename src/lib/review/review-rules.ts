import { evaluateForceReview, type ForceReviewReason } from "./force-review.ts";
import type { DeskItem } from "../schema/item.ts";
import type { ValidationIssue } from "../pipeline/validate-stage.ts";

export interface ReviewCandidate {
  item: DeskItem;
  validationIssues?: ValidationIssue[];
}

export interface ReviewedItemRecord {
  item: DeskItem;
  disposition: "approved" | "needs_review" | "validation_failed" | "suppressed";
  reasons: string[];
}

export interface ReviewStageResult {
  approved_items: DeskItem[];
  needs_review_items: DeskItem[];
  blocked_items: DeskItem[];
  records: ReviewedItemRecord[];
}

function formatForceReviewReason(reason: ForceReviewReason): string {
  switch (reason) {
    case "watch_closely_tag":
      return "Tagged Watch Closely and requires human review.";
    case "headline_only_summary":
      return "Summary appears too close to a headline-only extraction.";
    case "source_delayed_language":
      return "Summary language suggests a delayed or uncertain source check.";
    case "summary_too_thin":
      return "Summary is too thin for automatic publication confidence.";
  }
}

function markReviewState(
  item: DeskItem,
  disposition: ReviewedItemRecord["disposition"]
): DeskItem {
  if (disposition === "approved") {
    return {
      ...item,
      review_state: "approved"
    };
  }

  if (disposition === "needs_review") {
    return {
      ...item,
      review_state: "needs_review"
    };
  }

  if (disposition === "suppressed") {
    return {
      ...item,
      review_state: "suppressed"
    };
  }

  return {
    ...item,
    review_state: "validation_failed"
  };
}

export function reviewItem(candidate: ReviewCandidate): ReviewedItemRecord {
  if (candidate.validationIssues?.length) {
    return {
      item: markReviewState(candidate.item, "validation_failed"),
      disposition: "validation_failed",
      reasons: candidate.validationIssues.map((issue) => issue.message)
    };
  }

  const forceReview = evaluateForceReview(candidate.item);

  if (forceReview.forceReview) {
    return {
      item: markReviewState(candidate.item, "needs_review"),
      disposition: "needs_review",
      reasons: forceReview.reasons.map(formatForceReviewReason)
    };
  }

  return {
    item: markReviewState(candidate.item, "approved"),
    disposition: "approved",
    reasons: []
  };
}

export function runReviewStage(candidates: ReviewCandidate[]): ReviewStageResult {
  const records = candidates.map(reviewItem);

  return {
    approved_items: records
      .filter((record) => record.disposition === "approved")
      .map((record) => record.item),
    needs_review_items: records
      .filter((record) => record.disposition === "needs_review")
      .map((record) => record.item),
    blocked_items: records
      .filter((record) => record.disposition === "validation_failed" || record.disposition === "suppressed")
      .map((record) => record.item),
    records
  };
}
