import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getCurrentReviewSummaryPath, getCurrentSnapshotPath } from "./load-current-snapshot.ts";
import type { ReviewSummary } from "../review/review-summary.ts";
import { snapshotSchema, type Snapshot } from "../schema/snapshot.ts";

export interface WriteCurrentSnapshotInput {
  snapshot: Snapshot;
  reviewSummary?: ReviewSummary | null;
}

export async function writeCurrentSnapshot(
  input: WriteCurrentSnapshotInput
): Promise<{ snapshotPath: string; reviewSummaryPath: string }> {
  const snapshot = snapshotSchema.parse(input.snapshot);
  const snapshotPath = getCurrentSnapshotPath();
  const reviewSummaryPath = getCurrentReviewSummaryPath();

  await mkdir(path.dirname(snapshotPath), { recursive: true });

  await writeFile(`${snapshotPath}`, JSON.stringify(snapshot, null, 2), "utf8");

  if (input.reviewSummary) {
    await writeFile(reviewSummaryPath, JSON.stringify(input.reviewSummary, null, 2), "utf8");
  }

  return {
    snapshotPath,
    reviewSummaryPath
  };
}
