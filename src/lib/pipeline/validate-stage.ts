import { listApprovedSources } from "../sources/registry.ts";
import { deskItemSchema, type DeskItem } from "../schema/item.ts";
import { snapshotSchema, type Snapshot } from "../schema/snapshot.ts";

export type ValidationIssueReason =
  | "schema_validation_failed"
  | "source_name_mismatch"
  | "source_link_mismatch"
  | "unapproved_source"
  | "snapshot_schema_failed";

export interface ValidationIssue {
  item_id?: string;
  reason: ValidationIssueReason;
  message: string;
  source_name?: string;
  source_url?: string;
}

export interface ValidatedDeskItemRecord {
  item: DeskItem;
  valid: boolean;
  issues: ValidationIssue[];
}

export interface ValidateItemsStageResult {
  valid_items: DeskItem[];
  blocked_items: DeskItem[];
  item_results: ValidatedDeskItemRecord[];
  issues: ValidationIssue[];
}

export interface ValidateSnapshotResult {
  valid: boolean;
  snapshot?: Snapshot;
  issues: ValidationIssue[];
}

function normalizeHostname(value: string): string | null {
  try {
    return new URL(value).hostname.replace(/^www\./u, "").toLowerCase();
  } catch {
    return null;
  }
}

function buildAllowedHosts() {
  return listApprovedSources().map((source) => ({
    key: source.key,
    label: source.label,
    canonicalHost: normalizeHostname(source.canonicalUrl),
    endpointHost: normalizeHostname(source.endpointUrl)
  }));
}

const allowedSourceHosts = buildAllowedHosts();

function findMatchingSource(item: DeskItem) {
  const itemHost = normalizeHostname(item.source_url);

  return allowedSourceHosts.find((source) => {
    if (!itemHost) {
      return false;
    }

    const hostMatches =
      source.canonicalHost === itemHost || source.endpointHost === itemHost;
    const labelMatches = source.label === item.source_name;

    return hostMatches || labelMatches;
  });
}

function validateDeskItem(item: DeskItem): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const schemaResult = deskItemSchema.safeParse(item);

  if (!schemaResult.success) {
    issues.push({
      item_id: item.item_id,
      reason: "schema_validation_failed",
      message: schemaResult.error.issues
        .map((issue) => `${issue.path.join(".") || "item"}: ${issue.message}`)
        .join("; "),
      source_name: item.source_name,
      source_url: item.source_url
    });

    return issues;
  }

  const matchedSource = findMatchingSource(item);
  if (!matchedSource) {
    issues.push({
      item_id: item.item_id,
      reason: "unapproved_source",
      message: "Item source is not present in the approved source registry.",
      source_name: item.source_name,
      source_url: item.source_url
    });

    return issues;
  }

  const itemHost = normalizeHostname(item.source_url);
  const hostMatches =
    matchedSource.canonicalHost === itemHost || matchedSource.endpointHost === itemHost;

  if (!hostMatches) {
    issues.push({
      item_id: item.item_id,
      reason: "source_link_mismatch",
      message: "Item source URL does not match the approved source host.",
      source_name: item.source_name,
      source_url: item.source_url
    });
  }

  if (matchedSource.label !== item.source_name) {
    issues.push({
      item_id: item.item_id,
      reason: "source_name_mismatch",
      message: "Item source name does not match the approved source label.",
      source_name: item.source_name,
      source_url: item.source_url
    });
  }

  return issues;
}

function markValidationFailed(item: DeskItem): DeskItem {
  return {
    ...item,
    review_state: "validation_failed"
  };
}

export function runValidateStage(items: DeskItem[]): ValidateItemsStageResult {
  const itemResults = items.map((item) => {
    const issues = validateDeskItem(item);

    return {
      item,
      valid: issues.length === 0,
      issues
    } satisfies ValidatedDeskItemRecord;
  });

  const validItems = itemResults.filter((result) => result.valid).map((result) => result.item);
  const blockedItems = itemResults
    .filter((result) => !result.valid)
    .map((result) => markValidationFailed(result.item));

  return {
    valid_items: validItems,
    blocked_items: blockedItems,
    item_results: itemResults,
    issues: itemResults.flatMap((result) => result.issues)
  };
}

export function validateSnapshotCandidate(snapshot: unknown): ValidateSnapshotResult {
  const result = snapshotSchema.safeParse(snapshot);

  if (result.success) {
    return {
      valid: true,
      snapshot: result.data,
      issues: []
    };
  }

  return {
    valid: false,
    issues: result.error.issues.map((issue) => ({
      reason: "snapshot_schema_failed",
      message: `${issue.path.join(".") || "snapshot"}: ${issue.message}`
    }))
  };
}
