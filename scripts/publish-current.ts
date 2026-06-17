import currentSnapshot from "../data/current/snapshot.json" with { type: "json" };
import currentReviewSummary from "../data/current/review-summary.json" with { type: "json" };

import { archiveSnapshot } from "../src/lib/publishing/archive-snapshot.ts";
import { writeCurrentSnapshot } from "../src/lib/publishing/write-current-snapshot.ts";
import { snapshotSchema } from "../src/lib/schema/snapshot.ts";
import type { ReviewSummary } from "../src/lib/review/review-summary.ts";

const parsedSnapshot = snapshotSchema.parse(currentSnapshot);
const reviewSummary = currentReviewSummary as ReviewSummary;

const archived = await archiveSnapshot(parsedSnapshot, reviewSummary);
const written = await writeCurrentSnapshot({
  snapshot: parsedSnapshot,
  reviewSummary
});

console.log(
  JSON.stringify({
    action: "publish_current",
    snapshot_path: written.snapshotPath,
    archived_snapshot_path: archived.snapshotPath,
    archived_review_summary_path: archived.reviewSummaryPath
  })
);
