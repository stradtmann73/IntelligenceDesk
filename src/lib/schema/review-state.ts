import { z } from "zod";

export const reviewStateSchema = z.enum([
  "draft_generated",
  "validation_failed",
  "needs_review",
  "approved",
  "published",
  "held_stale",
  "suppressed"
]);

export type ReviewState = z.infer<typeof reviewStateSchema>;
