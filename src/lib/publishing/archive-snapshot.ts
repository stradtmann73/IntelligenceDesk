import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ReviewSummary } from "../review/review-summary.ts";
import { snapshotSchema, type Snapshot } from "../schema/snapshot.ts";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const archiveRoot = path.resolve(currentDirectory, "../../../data/archive");

function buildArchiveTimestamp(timestamp: string): string {
  return timestamp.replace(/[:]/g, "").replace(/\.\d{3}Z$/u, "Z");
}

export interface ArchiveSnapshotResult {
  snapshotPath: string;
  reviewSummaryPath: string | null;
}

export async function archiveSnapshot(
  snapshot: Snapshot,
  reviewSummary?: ReviewSummary | null
): Promise<ArchiveSnapshotResult> {
  const parsedSnapshot = snapshotSchema.parse(snapshot);
  const publishedAt = new Date(parsedSnapshot.published_at);
  const year = `${publishedAt.getUTCFullYear()}`;
  const month = `${publishedAt.getUTCMonth() + 1}`.padStart(2, "0");
  const archiveDirectory = path.join(archiveRoot, year, month);
  const stamp = buildArchiveTimestamp(parsedSnapshot.published_at);
  const snapshotPath = path.join(archiveDirectory, `snapshot-${stamp}.json`);
  const reviewSummaryPath = reviewSummary
    ? path.join(archiveDirectory, `review-summary-${stamp}.json`)
    : null;

  await mkdir(archiveDirectory, { recursive: true });
  await writeFile(snapshotPath, JSON.stringify(parsedSnapshot, null, 2), "utf8");

  if (reviewSummaryPath && reviewSummary) {
    await writeFile(reviewSummaryPath, JSON.stringify(reviewSummary, null, 2), "utf8");
  }

  return {
    snapshotPath,
    reviewSummaryPath
  };
}
