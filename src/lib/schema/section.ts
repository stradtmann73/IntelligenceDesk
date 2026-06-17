import { z } from "zod";

import { deskItemSchema, newsTopicSchema, providerSchema } from "./item.ts";

export const columnStateSchema = z.enum([
  "ready",
  "empty",
  "stale",
  "source_delayed"
]);

export const sectionKeySchema = z.enum([
  "llm_status",
  "llm_model_updates",
  "news"
]);

export const columnTypeSchema = z.enum(["provider", "topic"]);

export const sectionColumnSchema = z.object({
  column_key: z.string().min(1),
  label: z.string().min(1),
  column_type: columnTypeSchema,
  state: columnStateSchema,
  state_message: z.string().min(1).optional(),
  items: z.array(deskItemSchema).max(3)
});

export const sectionSchema = z.object({
  section_key: sectionKeySchema,
  title: z.string().min(1),
  description: z.string().min(1),
  columns: z.array(sectionColumnSchema).min(1).max(3)
}).superRefine((section, ctx) => {
  const isProviderSection =
    section.section_key === "llm_status" || section.section_key === "llm_model_updates";

  if (isProviderSection) {
    const expectedProviders = providerSchema.options;
    const actualKeys = section.columns.map((column) => column.column_key);
    const actualLabels = section.columns.map((column) => column.label);

    if (section.columns.some((column) => column.column_type !== "provider")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${section.section_key} must use provider columns only.`
      });
    }

    if (actualKeys.length !== expectedProviders.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${section.section_key} must include exactly ${expectedProviders.length} provider columns.`
      });
    }

    for (const provider of expectedProviders) {
      if (!actualKeys.includes(provider)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${section.section_key} is missing provider column '${provider}'.`
        });
      }
    }

    const duplicateKeys = actualKeys.filter((key, index) => actualKeys.indexOf(key) !== index);
    if (duplicateKeys.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${section.section_key} contains duplicate provider columns: ${duplicateKeys.join(", ")}.`
      });
    }

    const expectedLabels = ["OpenAI", "Gemini", "Claude"];
    expectedLabels.forEach((label, index) => {
      if (actualLabels[index] !== label) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${section.section_key} provider label at position ${index + 1} must be '${label}'.`
        });
      }
    });
  }

  if (section.section_key === "news") {
    const expectedTopics = newsTopicSchema.options;
    const actualKeys = section.columns.map((column) => column.column_key);
    const actualLabels = section.columns.map((column) => column.label);

    if (section.columns.some((column) => column.column_type !== "topic")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "news must use topic columns only."
      });
    }

    if (actualKeys.length !== expectedTopics.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `news must include exactly ${expectedTopics.length} topic columns.`
      });
    }

    for (const topic of expectedTopics) {
      if (!actualKeys.includes(topic)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `news is missing topic column '${topic}'.`
        });
      }
    }

    const expectedLabels = ["Investing and Finance", "Business General", "Opinion"];
    expectedLabels.forEach((label, index) => {
      if (actualLabels[index] !== label) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `news topic label at position ${index + 1} must be '${label}'.`
        });
      }
    });
  }
});

export type ColumnState = z.infer<typeof columnStateSchema>;
export type SectionKey = z.infer<typeof sectionKeySchema>;
export type ColumnType = z.infer<typeof columnTypeSchema>;
export type SectionColumn = z.infer<typeof sectionColumnSchema>;
export type DeskSection = z.infer<typeof sectionSchema>;
