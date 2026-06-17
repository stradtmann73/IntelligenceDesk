import type { SectionColumn, SectionKey } from "../schema/section.ts";

const providerColumnOrder = ["openai", "gemini", "claude"] as const;
const newsTopicOrder = ["investing_and_finance", "business_general", "opinion"] as const;

export function orderSectionColumns(
  sectionKey: SectionKey,
  columns: SectionColumn[]
): SectionColumn[] {
  if (sectionKey === "news") {
    const orderedTopics = newsTopicOrder
      .map((topicKey) => columns.find((column) => column.column_key === topicKey))
      .filter((column): column is SectionColumn => Boolean(column));

    const remainingTopics = columns.filter(
      (column) => !newsTopicOrder.includes(column.column_key as (typeof newsTopicOrder)[number])
    );

    return [...orderedTopics, ...remainingTopics];
  }

  if (sectionKey !== "llm_status" && sectionKey !== "llm_model_updates") {
    return columns;
  }

  const orderedColumns = providerColumnOrder
    .map((providerKey) => columns.find((column) => column.column_key === providerKey))
    .filter((column): column is SectionColumn => Boolean(column));

  const remainingColumns = columns.filter(
    (column) => !providerColumnOrder.includes(column.column_key as (typeof providerColumnOrder)[number])
  );

  return [...orderedColumns, ...remainingColumns];
}
