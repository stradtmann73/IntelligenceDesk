import type { ReviewStageResult } from "./review-rules.ts";

export interface ReviewSummary {
  reviewer_type: "system" | "human";
  notes: string;
  counts: {
    approved: number;
    needs_review: number;
    blocked: number;
  };
}

export function buildReviewSummary(result: ReviewStageResult): ReviewSummary {
  const approved = result.approved_items.length;
  const needsReview = result.needs_review_items.length;
  const blocked = result.blocked_items.length;

  const notes = [
    `${approved} item(s) auto-approved.`,
    `${needsReview} item(s) require human review.`,
    `${blocked} item(s) blocked or suppressed.`
  ].join(" ");

  return {
    reviewer_type: "system",
    notes,
    counts: {
      approved,
      needs_review: needsReview,
      blocked
    }
  };
}
