import { rollbackSnapshot } from "../src/lib/publishing/rollback-snapshot.ts";

const snapshotArchivePath = process.argv[2];

if (!snapshotArchivePath) {
  console.error("Usage: node --experimental-strip-types ./scripts/rollback-to-snapshot.ts <archive-snapshot-path>");
  process.exit(1);
}

const result = await rollbackSnapshot(snapshotArchivePath);

console.log(
  JSON.stringify({
    action: "rollback_snapshot",
    restored_from: result.restoredFrom,
    restored_review_summary_from: result.restoredReviewSummaryFrom,
    published_at: result.restoredSnapshot.published_at
  })
);
