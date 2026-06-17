import { getSourceByKey } from "../sources/registry.ts";
import type { SourceFetchFailure } from "../sources/shared/source-result.ts";
import { runRankStage } from "./rank-stage.ts";
import type { ReviewSummary } from "../review/review-summary.ts";
import type { DeskItem, NewsTopic, Provider } from "../schema/item.ts";
import type { ReviewState } from "../schema/review-state.ts";
import type {
  ColumnState,
  DeskSection,
  SectionColumn,
  SectionKey
} from "../schema/section.ts";
import type { Snapshot } from "../schema/snapshot.ts";

const providerLabels: Record<Provider, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  claude: "Claude"
};

const newsLabels: Record<NewsTopic, string> = {
  investing_and_finance: "Investing and Finance",
  business_general: "Business General",
  opinion: "Opinion"
};

const sectionMeta: Record<SectionKey, Pick<DeskSection, "title" | "description">> = {
  llm_status: {
    title: "LLM Status",
    description: "Operational signals from official provider status sources."
  },
  llm_model_updates: {
    title: "LLM/Model Updates",
    description: "Official provider changes summarized in plain English."
  },
  news: {
    title: "News",
    description: "Curated AI business and investing coverage, kept separate from provider updates."
  }
};

type ColumnKey = Provider | NewsTopic;

export interface BuildSnapshotInput {
  approvedItems: DeskItem[];
  reviewSummary: ReviewSummary;
  publishState: ReviewState;
  generatedAt?: string;
  publishedAt?: string;
  refreshWindowHours?: number;
  rendererMode?: Snapshot["renderer_mode"];
  sourceFailures?: SourceFetchFailure[];
  previousSnapshot?: Snapshot | null;
}

function expectedColumnKeys(sectionKey: SectionKey): ColumnKey[] {
  if (sectionKey === "news") {
    return ["investing_and_finance", "business_general", "opinion"];
  }

  return ["openai", "gemini", "claude"];
}

function toColumnType(sectionKey: SectionKey): SectionColumn["column_type"] {
  return sectionKey === "news" ? "topic" : "provider";
}

function toLabel(sectionKey: SectionKey, columnKey: ColumnKey): string {
  if (sectionKey === "news") {
    return newsLabels[columnKey as NewsTopic];
  }

  return providerLabels[columnKey as Provider];
}

function findPreviousColumn(
  previousSnapshot: Snapshot | null | undefined,
  sectionKey: SectionKey,
  columnKey: ColumnKey
): SectionColumn | undefined {
  return previousSnapshot?.sections
    .find((section) => section.section_key === sectionKey)
    ?.columns.find((column) => column.column_key === columnKey);
}

function affectedColumnsFromFailures(sourceFailures: SourceFetchFailure[]): Set<string> {
  const affected = new Set<string>();

  for (const failure of sourceFailures) {
    const source = getSourceByKey(failure.sourceKey);
    if (!source) {
      continue;
    }

    if ("provider" in source.scope) {
      const sectionKey =
        failure.sourceClass === "status" ? "llm_status" : "llm_model_updates";
      affected.add(`${sectionKey}:${source.scope.provider}`);
      continue;
    }

    affected.add(`news:${source.scope.topic}`);
  }

  return affected;
}

function fallbackStateForSection(sectionKey: SectionKey): ColumnState {
  return sectionKey === "llm_status" ? "source_delayed" : "stale";
}

function fallbackMessageForSection(sectionKey: SectionKey): string {
  if (sectionKey === "llm_status") {
    return "Source check delayed. Last verified item shown below.";
  }

  return "Fresh verification was not completed in this window, so the last approved item is shown with a stale warning.";
}

function emptyMessageForSection(sectionKey: SectionKey): string {
  if (sectionKey === "news") {
    return "No items cleared the relevance bar in this refresh window.";
  }

  if (sectionKey === "llm_model_updates") {
    return "No meaningful provider changes were approved in this refresh window.";
  }

  return "No verified status items were available in this refresh window.";
}

function toSectionKey(item: DeskItem): SectionKey {
  if (item.item_type === "status") {
    return "llm_status";
  }

  if (item.item_type === "update") {
    return "llm_model_updates";
  }

  return "news";
}

function buildSectionColumn(
  sectionKey: SectionKey,
  columnKey: ColumnKey,
  approvedItems: DeskItem[],
  affectedColumns: Set<string>,
  previousSnapshot?: Snapshot | null
): SectionColumn {
  const selectedItems = approvedItems.filter(
    (item) =>
      toSectionKey(item) === sectionKey && item.provider_or_topic === columnKey
  );

  if (selectedItems.length > 0) {
    return {
      column_key: columnKey,
      label: toLabel(sectionKey, columnKey),
      column_type: toColumnType(sectionKey),
      state: "ready",
      items: selectedItems
    };
  }

  const isAffected = affectedColumns.has(`${sectionKey}:${columnKey}`);
  const previousColumn = findPreviousColumn(previousSnapshot, sectionKey, columnKey);

  if (isAffected && previousColumn?.items.length) {
    return {
      ...previousColumn,
      state: fallbackStateForSection(sectionKey),
      state_message: fallbackMessageForSection(sectionKey)
    };
  }

  return {
    column_key: columnKey,
    label: toLabel(sectionKey, columnKey),
    column_type: toColumnType(sectionKey),
    state: "empty",
    state_message: isAffected
      ? fallbackMessageForSection(sectionKey)
      : emptyMessageForSection(sectionKey),
    items: []
  };
}

function buildSections(
  approvedItems: DeskItem[],
  sourceFailures: SourceFetchFailure[],
  previousSnapshot?: Snapshot | null
): DeskSection[] {
  const rankedSelections = runRankStage(approvedItems);
  const rankedItems = rankedSelections.flatMap((selection) => selection.items);
  const affectedColumns = affectedColumnsFromFailures(sourceFailures);
  const sectionKeys: SectionKey[] = ["llm_status", "llm_model_updates", "news"];

  return sectionKeys.map((sectionKey) => ({
    section_key: sectionKey,
    title: sectionMeta[sectionKey].title,
    description: sectionMeta[sectionKey].description,
    columns: expectedColumnKeys(sectionKey).map((columnKey) =>
      buildSectionColumn(sectionKey, columnKey, rankedItems, affectedColumns, previousSnapshot)
    )
  }));
}

function deriveSnapshotPublishState(
  requestedState: ReviewState,
  sourceFailures: SourceFetchFailure[],
  previousSnapshot?: Snapshot | null
): ReviewState {
  if (sourceFailures.length > 0 && previousSnapshot) {
    return "held_stale";
  }

  return requestedState;
}

export function buildSnapshotCandidate(input: BuildSnapshotInput): Snapshot {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const publishedAt = input.publishedAt ?? generatedAt;
  const sourceFailures = input.sourceFailures ?? [];

  return {
    schema_version: "1.0.0",
    generated_at: generatedAt,
    published_at: publishedAt,
    refresh_window_hours: input.refreshWindowHours ?? 12,
    member_surface: "circle",
    renderer_mode: input.rendererMode ?? "fallback_preview",
    publish_state: deriveSnapshotPublishState(
      input.publishState,
      sourceFailures,
      input.previousSnapshot
    ),
    review_summary: {
      reviewer_type: input.reviewSummary.reviewer_type,
      notes: input.reviewSummary.notes
    },
    sections: buildSections(input.approvedItems, sourceFailures, input.previousSnapshot)
  };
}
