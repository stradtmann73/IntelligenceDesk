import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ReviewSummary } from "../review/review-summary.ts";
import { snapshotSchema, type Snapshot } from "../schema/snapshot.ts";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.resolve(currentDirectory, "../../../data");
const currentSnapshotPath = path.join(dataDirectory, "current", "snapshot.json");
const currentReviewSummaryPath = path.join(dataDirectory, "current", "review-summary.json");

export interface CurrentPublishedSnapshot {
  snapshot: Snapshot;
  reviewSummary: ReviewSummary | null;
  snapshotPath: string;
  reviewSummaryPath: string;
}

export function getCurrentSnapshotPath(): string {
  return currentSnapshotPath;
}

export function getCurrentReviewSummaryPath(): string {
  return currentReviewSummaryPath;
}

export async function loadCurrentSnapshot(): Promise<CurrentPublishedSnapshot> {
  const [snapshotRaw, reviewSummaryRaw] = await Promise.all([
    readFile(currentSnapshotPath, "utf8"),
    readFile(currentReviewSummaryPath, "utf8").catch(() => null)
  ]);

  const snapshot = snapshotSchema.parse(JSON.parse(snapshotRaw));
  const reviewSummary = reviewSummaryRaw
    ? (JSON.parse(reviewSummaryRaw) as ReviewSummary)
    : null;

  return {
    snapshot,
    reviewSummary,
    snapshotPath: currentSnapshotPath,
    reviewSummaryPath: currentReviewSummaryPath
  };
}
