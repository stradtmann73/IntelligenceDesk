export type SourceClass = "status" | "updates" | "news";

export type SourceTransport = "status_page" | "html" | "rss";

export type SourceOwner =
  | "openai"
  | "google"
  | "anthropic"
  | "cnbc"
  | "bloomberg"
  | "techcrunch"
  | "yahoo";

export type ProviderKey = "openai" | "gemini" | "claude";

export type NewsTopicKey = "investing_and_finance" | "business_general" | "opinion";

export type SourceScope =
  | { provider: ProviderKey; topic?: never }
  | { provider?: never; topic: NewsTopicKey };

export interface SourceFetchContext {
  fetchedAt: string;
  userAgent?: string;
}

export interface SourceFetchError {
  code: "network_error" | "http_error" | "parse_error" | "unsupported_source";
  message: string;
  status?: number;
}

export interface RawSourceItem {
  externalId?: string;
  headline: string;
  summary?: string;
  sourceUrl: string;
  publishedAt?: string | null;
  rawText?: string;
  metadata?: Record<string, string>;
}

export interface SourceFetchSuccess {
  ok: true;
  sourceKey: string;
  sourceClass: SourceClass;
  fetchedAt: string;
  items: RawSourceItem[];
}

export interface SourceFetchFailure {
  ok: false;
  sourceKey: string;
  sourceClass: SourceClass;
  fetchedAt: string;
  items: [];
  error: SourceFetchError;
}

export type SourceFetchResult = SourceFetchSuccess | SourceFetchFailure;

export type SourceFetcher = (
  source: ApprovedSourceDefinition,
  context: SourceFetchContext
) => Promise<SourceFetchResult>;

export interface ApprovedSourceDefinition {
  key: string;
  label: string;
  owner: SourceOwner;
  sourceClass: SourceClass;
  transport: SourceTransport;
  endpointUrl: string;
  canonicalUrl: string;
  active: boolean;
  notes?: string;
  scope: SourceScope;
  fetch: SourceFetcher;
}

export function defineSource(definition: ApprovedSourceDefinition): ApprovedSourceDefinition {
  return definition;
}

export function buildFetchSuccess(
  source: ApprovedSourceDefinition,
  context: SourceFetchContext,
  items: RawSourceItem[]
): SourceFetchSuccess {
  return {
    ok: true,
    sourceKey: source.key,
    sourceClass: source.sourceClass,
    fetchedAt: context.fetchedAt,
    items
  };
}

export function buildFetchFailure(
  source: ApprovedSourceDefinition,
  context: SourceFetchContext,
  error: SourceFetchError
): SourceFetchFailure {
  return {
    ok: false,
    sourceKey: source.key,
    sourceClass: source.sourceClass,
    fetchedAt: context.fetchedAt,
    items: [],
    error
  };
}
