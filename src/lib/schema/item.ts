import { z } from "zod";

import { reviewStateSchema } from "./review-state.ts";

export const providerSchema = z.enum(["openai", "gemini", "claude"]);
export const newsTopicSchema = z.enum([
  "investing_and_finance",
  "business_general",
  "opinion"
]);

export const statusLabelSchema = z.enum([
  "Stable",
  "Degraded",
  "Outage",
  "Recently unstable"
]);

export const significanceTagSchema = z.enum([
  "Minor",
  "Notable",
  "Important",
  "Watch Closely"
]);

const isoTimestampSchema = z.string().datetime({ offset: true });
const urlSchema = z.string().url();

export const baseItemSchema = z.object({
  item_id: z.string().min(1),
  headline: z.string().min(1),
  summary: z.string().min(1).max(280),
  source_name: z.string().min(1),
  source_url: urlSchema,
  published_at: isoTimestampSchema,
  source_checked_at: isoTimestampSchema,
  review_state: reviewStateSchema
});

export const statusItemSchema = baseItemSchema.extend({
  item_type: z.literal("status"),
  provider_or_topic: providerSchema,
  status_label: statusLabelSchema
});

export const updateItemSchema = baseItemSchema.extend({
  item_type: z.literal("update"),
  provider_or_topic: providerSchema,
  significance_tag: significanceTagSchema
});

export const newsItemSchema = baseItemSchema.extend({
  item_type: z.literal("news"),
  provider_or_topic: newsTopicSchema
});

export const deskItemSchema = z.discriminatedUnion("item_type", [
  statusItemSchema,
  updateItemSchema,
  newsItemSchema
]);

export type Provider = z.infer<typeof providerSchema>;
export type NewsTopic = z.infer<typeof newsTopicSchema>;
export type StatusLabel = z.infer<typeof statusLabelSchema>;
export type SignificanceTag = z.infer<typeof significanceTagSchema>;
export type BaseItem = z.infer<typeof baseItemSchema>;
export type StatusItem = z.infer<typeof statusItemSchema>;
export type UpdateItem = z.infer<typeof updateItemSchema>;
export type NewsItem = z.infer<typeof newsItemSchema>;
export type DeskItem = z.infer<typeof deskItemSchema>;
