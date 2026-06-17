import { copyFile, readFile } from "node:fs/promises";
import path from "node:path";

import { getCurrentReviewSummaryPath, getCurrentSnapshotPath } from "./load-current-snapshot.ts";
import { snapshotSchema, type Snapshot } from "../schema/snapshot.ts";

export interface RollbackSnapshotResult {
  restoredSnapshot: Snapshot;
  restoredFrom: string;
  restoredReviewSummaryFrom?: string;
}

function inferReviewSummaryPath(snapshotPath: string): string {
  const directory = path.dirname(snapshotPath);
  const filename = path.basename(snapshotPath).replace(/^snapshot-/u, "review-summary-");
  return path.join(directory, filename);
}

export async function rollbackSnapshot(snapshotArchivePath: string): Promise<RollbackSnapshotResult> {
  const reviewSummaryArchivePath = inferReviewSummaryPath(snapshotArchivePath);
  const currentSnapshotPath = getCurrentSnapshotPath();
  const currentReviewSummaryPath = getCurrentReviewSummaryPath();

  const snapshotRaw = await readFile(snapshotArchivePath, "utf8");
  const restoredSnapshot = snapshotSchema.parse(JSON.parse(snapshotRaw));

  await copyFile(snapshotArchivePath, currentSnapshotPath);

  const reviewSummaryExists = await readFile(reviewSummaryArchivePath, "utf8")
    .then(() => true)
    .catch(() => false);

  if (reviewSummaryExists) {
    await copyFile(reviewSummaryArchivePath, currentReviewSummaryPath);
  }

  return {
    restoredSnapshot,
    restoredFrom: snapshotArchivePath,
    restoredReviewSummaryFrom: reviewSummaryExists ? reviewSummaryArchivePath : undefined
  };
}
