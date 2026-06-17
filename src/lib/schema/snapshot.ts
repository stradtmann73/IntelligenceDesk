import { z } from "zod";

import { reviewStateSchema } from "./review-state.ts";
import { sectionSchema } from "./section.ts";

const isoTimestampSchema = z.string().datetime({ offset: true });

export const snapshotSchema = z.object({
  schema_version: z.literal("1.0.0"),
  generated_at: isoTimestampSchema,
  published_at: isoTimestampSchema,
  refresh_window_hours: z.number().int().positive(),
  member_surface: z.literal("circle"),
  renderer_mode: z.enum(["native_candidate", "fallback_preview"]),
  publish_state: reviewStateSchema,
  review_summary: z.object({
    reviewer_type: z.enum(["system", "human"]),
    notes: z.string().min(1)
  }),
  sections: z.array(sectionSchema).length(3)
});

export type Snapshot = z.infer<typeof snapshotSchema>;
