import type { ReviewStageResult } from "../review/review-rules.ts";
import type { ReviewState } from "../schema/review-state.ts";

export function derivePublishState(review: ReviewStageResult): ReviewState {
  if (review.approved_items.length > 0) {
    return "approved";
  }

  if (review.needs_review_items.length > 0) {
    return "needs_review";
  }

  if (review.blocked_items.length > 0) {
    return "validation_failed";
  }

  return "draft_generated";
}
