import { routeNewsTopic } from "../sources/news/topic-routing.ts";
import { getSourceByKey } from "../sources/registry.ts";
import {
  cleanHeadlineText,
  cleanSourceSummary,
  summarizeText
} from "../sources/shared/normalize-html.ts";
import { toPublicSourceUrl } from "./public-source-url.ts";
import type {
  NewsTopicKey,
  ProviderKey,
  RawSourceItem,
  SourceClass,
  SourceFetchFailure,
  SourceFetchResult
} from "../sources/shared/source-result.ts";
import type { ReviewState } from "../schema/review-state.ts";

export interface CandidateBaseItem {
  item_id: string;
  item_type: "status" | "update" | "news";
  provider_or_topic: ProviderKey | NewsTopicKey;
  headline: string;
  summary: string;
  source_name: string;
  source_url: string;
  published_at: string;
  source_checked_at: string;
  review_state: ReviewState;
}

export interface CandidateStatusItem extends CandidateBaseItem {
  item_type: "status";
  provider_or_topic: ProviderKey;
}

export interface CandidateUpdateItem extends CandidateBaseItem {
  item_type: "update";
  provider_or_topic: ProviderKey;
}

export interface CandidateNewsItem extends CandidateBaseItem {
  item_type: "news";
  provider_or_topic: NewsTopicKey;
}

export type CandidateItem = CandidateStatusItem | CandidateUpdateItem | CandidateNewsItem;

export interface NormalizationReject {
  source_key: string;
  source_class: SourceClass;
  reason: "missing_source_definition" | "missing_headline" | "invalid_source_url";
  external_id?: string;
  headline?: string;
}

export interface NormalizeStageResult {
  items: CandidateItem[];
  rejected: NormalizationReject[];
  source_failures: SourceFetchFailure[];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function toCanonicalItemType(sourceClass: SourceClass): CandidateItem["item_type"] {
  switch (sourceClass) {
    case "status":
      return "status";
    case "updates":
      return "update";
    case "news":
      return "news";
  }
}

function toPublishedAt(raw: RawSourceItem, fetchedAt: string): string {
  const candidate = raw.publishedAt ?? fetchedAt;
  const parsed = new Date(candidate);

  if (Number.isNaN(parsed.getTime())) {
    return fetchedAt;
  }

  return parsed.toISOString();
}

function buildItemId(sourceKey: string, raw: RawSourceItem): string {
  const suffix = raw.externalId?.trim() || slugify(raw.headline || "untitled-item");
  return `${sourceKey}:${suffix}`;
}

function normalizeSummary(raw: RawSourceItem): string {
  const sourceText = cleanSourceSummary(
    raw.summary?.trim() || raw.rawText?.trim() || raw.headline.trim()
  );
  return summarizeText(sourceText, 280);
}

function normalizeNewsTopic(
  raw: RawSourceItem,
  fallbackTopic?: NewsTopicKey
): NewsTopicKey {
  const routed = routeNewsTopic(raw);
  return fallbackTopic || routed || "business_general";
}

function normalizeCandidate(
  result: Extract<SourceFetchResult, { ok: true }>,
  raw: RawSourceItem
): CandidateItem | NormalizationReject {
  const source = getSourceByKey(result.sourceKey);

  if (!source) {
    return {
      source_key: result.sourceKey,
      source_class: result.sourceClass,
      reason: "missing_source_definition",
      external_id: raw.externalId,
      headline: raw.headline
    };
  }

  const headline = cleanHeadlineText(raw.headline);
  if (!headline) {
    return {
      source_key: result.sourceKey,
      source_class: result.sourceClass,
      reason: "missing_headline",
      external_id: raw.externalId
    };
  }

  try {
    new URL(raw.sourceUrl);
  } catch {
    return {
      source_key: result.sourceKey,
      source_class: result.sourceClass,
      reason: "invalid_source_url",
      external_id: raw.externalId,
      headline
    };
  }

  let providerOrTopic: ProviderKey | NewsTopicKey;

  if (result.sourceClass === "news") {
    providerOrTopic = normalizeNewsTopic(raw, "topic" in source.scope ? source.scope.topic : undefined);
  } else {
    if (!("provider" in source.scope)) {
      return {
        source_key: result.sourceKey,
        source_class: result.sourceClass,
        reason: "missing_source_definition",
        external_id: raw.externalId,
        headline
      };
    }

    providerOrTopic = source.scope.provider!;
  }

  const baseItem: CandidateBaseItem = {
    item_id: buildItemId(result.sourceKey, raw),
    item_type: toCanonicalItemType(result.sourceClass),
    provider_or_topic: providerOrTopic,
    headline,
    summary: normalizeSummary(raw),
    source_name: source.label,
    source_url: toPublicSourceUrl(raw.sourceUrl, source.canonicalUrl),
    published_at: toPublishedAt(raw, result.fetchedAt),
    source_checked_at: result.fetchedAt,
    review_state: "draft_generated"
  };

  if (baseItem.item_type === "status") {
    return baseItem as CandidateStatusItem;
  }

  if (baseItem.item_type === "update") {
    return baseItem as CandidateUpdateItem;
  }

  return baseItem as CandidateNewsItem;
}

export function runNormalizeStage(results: SourceFetchResult[]): NormalizeStageResult {
  const items: CandidateItem[] = [];
  const rejected: NormalizationReject[] = [];
  const sourceFailures: SourceFetchFailure[] = [];

  for (const result of results) {
    if (!result.ok) {
      sourceFailures.push(result);
      continue;
    }

    for (const raw of result.items) {
      const normalized = normalizeCandidate(result, raw);

      if ("reason" in normalized) {
        rejected.push(normalized);
        continue;
      }

      items.push(normalized);
    }
  }

  return {
    items,
    rejected,
    source_failures: sourceFailures
  };
}
