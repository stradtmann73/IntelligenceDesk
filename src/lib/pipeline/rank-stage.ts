import type { ReviewState } from "../schema/review-state.ts";
import type { NewsTopic, Provider, SignificanceTag, StatusLabel } from "../schema/item.ts";
import type { SectionKey } from "../schema/section.ts";

const statusPriority: Record<StatusLabel, number> = {
  Outage: 4,
  Degraded: 3,
  "Recently unstable": 2,
  Stable: 1
};

const updatePriority: Record<SignificanceTag, number> = {
  "Watch Closely": 4,
  Important: 3,
  Notable: 2,
  Minor: 1
};

const reviewPriority: Record<ReviewState, number> = {
  published: 6,
  approved: 5,
  held_stale: 4,
  needs_review: 3,
  draft_generated: 2,
  validation_failed: 1,
  suppressed: 0
};

export type RankableDeskLikeItem = {
  item_id: string;
  item_type: "status" | "update" | "news";
  provider_or_topic: Provider | NewsTopic;
  published_at: string;
  source_checked_at: string;
  review_state: ReviewState;
  source_name?: string;
  status_label?: StatusLabel;
  significance_tag?: SignificanceTag;
};

export interface RankedColumnSelection<TItem extends RankableDeskLikeItem> {
  section_key: SectionKey;
  column_key: Provider | NewsTopic;
  items: TItem[];
}

function getSectionKey(item: RankableDeskLikeItem): SectionKey {
  if (item.item_type === "status") {
    return "llm_status";
  }

  if (item.item_type === "update") {
    return "llm_model_updates";
  }

  return "news";
}

function toTimestamp(value: string): number {
  return new Date(value).getTime();
}

function compareStatusItems(left: RankableDeskLikeItem, right: RankableDeskLikeItem): number {
  const statusDelta =
    (statusPriority[right.status_label ?? "Stable"] ?? 0) -
    (statusPriority[left.status_label ?? "Stable"] ?? 0);

  if (statusDelta !== 0) {
    return statusDelta;
  }

  const checkedDelta = toTimestamp(right.source_checked_at) - toTimestamp(left.source_checked_at);
  if (checkedDelta !== 0) {
    return checkedDelta;
  }

  return toTimestamp(right.published_at) - toTimestamp(left.published_at);
}

function compareUpdateItems(left: RankableDeskLikeItem, right: RankableDeskLikeItem): number {
  const significanceDelta =
    (updatePriority[right.significance_tag ?? "Minor"] ?? 0) -
    (updatePriority[left.significance_tag ?? "Minor"] ?? 0);

  if (significanceDelta !== 0) {
    return significanceDelta;
  }

  const reviewDelta = reviewPriority[right.review_state] - reviewPriority[left.review_state];
  if (reviewDelta !== 0) {
    return reviewDelta;
  }

  return toTimestamp(right.published_at) - toTimestamp(left.published_at);
}

function compareNewsItems(left: RankableDeskLikeItem, right: RankableDeskLikeItem): number {
  const reviewDelta = reviewPriority[right.review_state] - reviewPriority[left.review_state];
  if (reviewDelta !== 0) {
    return reviewDelta;
  }

  return toTimestamp(right.published_at) - toTimestamp(left.published_at);
}

function rankNewsItemsWithSourceDiversity<TItem extends RankableDeskLikeItem>(
  items: TItem[],
  limit: number
): TItem[] {
  const sorted = [...items].sort(compareNewsItems);
  const selected: TItem[] = [];
  const seenSources = new Set<string>();

  for (const item of sorted) {
    const sourceName = item.source_name?.trim();

    if (!sourceName || seenSources.has(sourceName)) {
      continue;
    }

    selected.push(item);
    seenSources.add(sourceName);

    if (selected.length === limit) {
      return selected;
    }
  }

  for (const item of sorted) {
    if (selected.includes(item)) {
      continue;
    }

    selected.push(item);

    if (selected.length === limit) {
      break;
    }
  }

  return selected;
}

export function rankItemsForColumn<TItem extends RankableDeskLikeItem>(
  sectionKey: SectionKey,
  items: TItem[],
  limit = 3
): TItem[] {
  if (sectionKey === "news") {
    return rankNewsItemsWithSourceDiversity(items, limit);
  }

  const sorted = [...items].sort((left, right) => {
    if (sectionKey === "llm_status") {
      return compareStatusItems(left, right);
    }

    if (sectionKey === "llm_model_updates") {
      return compareUpdateItems(left, right);
    }

    return 0;
  });

  return sorted.slice(0, limit);
}

export function runRankStage<TItem extends RankableDeskLikeItem>(
  items: TItem[],
  limitPerColumn = 3
): RankedColumnSelection<TItem>[] {
  const grouped = new Map<string, TItem[]>();

  for (const item of items) {
    const sectionKey = getSectionKey(item);
    const mapKey = `${sectionKey}:${item.provider_or_topic}`;
    const existing = grouped.get(mapKey) ?? [];
    existing.push(item);
    grouped.set(mapKey, existing);
  }

  return [...grouped.entries()].map(([mapKey, groupItems]) => {
    const [sectionKey, columnKey] = mapKey.split(":") as [SectionKey, Provider | NewsTopic];

    return {
      section_key: sectionKey,
      column_key: columnKey,
      items: rankItemsForColumn(sectionKey, groupItems, limitPerColumn)
    };
  });
}
