import type { CandidateItem } from "./normalize-stage.ts";
import { summarizeText } from "../sources/shared/normalize-html.ts";

function stripTrailingPunctuation(input: string): string {
  return input.trim().replace(/[.!?]+$/u, "");
}

function buildStatusSummary(item: CandidateItem): string {
  const base = stripTrailingPunctuation(item.summary);
  return summarizeText(`Official status read: ${base}.`, 280);
}

function buildUpdateSummary(item: CandidateItem): string {
  const base = stripTrailingPunctuation(item.summary);
  return summarizeText(`Plain-English takeaway: ${base}.`, 280);
}

function buildNewsSummary(item: CandidateItem): string {
  const base = stripTrailingPunctuation(item.summary);
  return summarizeText(`Why it matters: ${base}.`, 280);
}

export function summarizeCandidateItem(item: CandidateItem): CandidateItem {
  if (item.item_type === "status") {
    return {
      ...item,
      summary: buildStatusSummary(item)
    };
  }

  if (item.item_type === "update") {
    return {
      ...item,
      summary: buildUpdateSummary(item)
    };
  }

  return {
    ...item,
    summary: buildNewsSummary(item)
  };
}

export function runSummarizeStage(items: CandidateItem[]): CandidateItem[] {
  return items.map(summarizeCandidateItem);
}
