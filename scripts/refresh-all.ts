import { buildSnapshotCandidate } from "../src/lib/pipeline/build-snapshot.ts";
import { runClassifyStage } from "../src/lib/pipeline/classify-stage.ts";
import { runFetchStage } from "../src/lib/pipeline/fetch-stage.ts";
import { runNormalizeStage } from "../src/lib/pipeline/normalize-stage.ts";
import { buildReviewSummary } from "../src/lib/review/review-summary.ts";
import { runReviewStage } from "../src/lib/review/review-rules.ts";
import { runSummarizeStage } from "../src/lib/pipeline/summarize-stage.ts";
import { derivePublishState } from "../src/lib/publishing/publish-state.ts";
import { archiveSnapshot } from "../src/lib/publishing/archive-snapshot.ts";
import { loadCurrentSnapshot } from "../src/lib/publishing/load-current-snapshot.ts";
import { writeCurrentSnapshot } from "../src/lib/publishing/write-current-snapshot.ts";
import { runValidateStage, validateSnapshotCandidate } from "../src/lib/pipeline/validate-stage.ts";
import { createLogEvent } from "../src/lib/logging/log-event.ts";
import { logEvents, logEvent } from "../src/lib/logging/logger.ts";

const fetchedAt = new Date().toISOString();

const previousSnapshot = await loadCurrentSnapshot()
  .then((result) => result.snapshot)
  .catch(() => null);

logEvent(createLogEvent("refresh", "info", { reason: "Starting scheduled refresh workflow." }));

const fetchResults = await runFetchStage({ fetchedAt });
logEvents(
  fetchResults.map((result) =>
    createLogEvent("fetch", result.ok ? "success" : "warning", {
      source_type: result.sourceClass,
      provider_or_topic: result.sourceKey,
      reason: result.ok
        ? `${result.items.length} raw item(s) fetched.`
        : result.error.message
    })
  )
);

const normalized = runNormalizeStage(fetchResults);
logEvent(
  createLogEvent("normalize", "info", {
    reason: `${normalized.items.length} candidate item(s); ${normalized.rejected.length} rejected; ${normalized.source_failures.length} source failure(s).`
  })
);

const summarized = runSummarizeStage(normalized.items);
const classified = runClassifyStage(summarized);
const validated = runValidateStage(classified);

logEvent(
  createLogEvent("validate", validated.issues.length ? "warning" : "success", {
    reason: `${validated.valid_items.length} valid item(s); ${validated.blocked_items.length} blocked item(s).`
  })
);

const review = runReviewStage([
  ...validated.valid_items.map((item) => ({ item })),
  ...validated.item_results
    .filter((result) => !result.valid)
    .map((result) => ({ item: result.item, validationIssues: result.issues }))
]);

const reviewSummary = buildReviewSummary(review);
const publishState = derivePublishState(review);

logEvent(
  createLogEvent("review", review.needs_review_items.length ? "warning" : "success", {
    reason: reviewSummary.notes
  })
);

const snapshotCandidate = buildSnapshotCandidate({
  approvedItems: review.approved_items,
  reviewSummary,
  publishState,
  generatedAt: fetchedAt,
  publishedAt: fetchedAt,
  sourceFailures: normalized.source_failures,
  previousSnapshot
});

const snapshotValidation = validateSnapshotCandidate(snapshotCandidate);
if (!snapshotValidation.valid || !snapshotValidation.snapshot) {
  logEvents(
    snapshotValidation.issues.map((issue) =>
      createLogEvent("snapshot_validation", "error", {
        reason: issue.message
      })
    )
  );
  process.exit(1);
}

const validatedSnapshot = snapshotValidation.snapshot;

const shouldPublish =
  validatedSnapshot.publish_state === "approved" ||
  validatedSnapshot.publish_state === "held_stale";

if (!shouldPublish) {
  logEvent(
    createLogEvent("publish", "warning", {
      reason: `Snapshot held with publish state '${validatedSnapshot.publish_state}'. Current published snapshot was not replaced.`
    })
  );
  process.exitCode = 1;
} else {
  const archived = await archiveSnapshot(validatedSnapshot, reviewSummary);
  const written = await writeCurrentSnapshot({
    snapshot: {
      ...validatedSnapshot,
      publish_state: validatedSnapshot.publish_state === "approved"
        ? "published"
        : validatedSnapshot.publish_state
    },
    reviewSummary
  });

  logEvent(
    createLogEvent("publish", "success", {
      reason: `Snapshot written to ${written.snapshotPath} and archived at ${archived.snapshotPath}.`
    })
  );
}
