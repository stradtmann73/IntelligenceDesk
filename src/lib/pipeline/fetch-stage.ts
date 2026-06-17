import { listApprovedSources, listSourcesByClass } from "../sources/registry.ts";
import type {
  ApprovedSourceDefinition,
  SourceClass,
  SourceFetchContext,
  SourceFetchResult
} from "../sources/shared/source-result.ts";

const defaultUserAgent = "AnswerBar-IntelligenceDesk/0.1 (+https://answerbar.io)";

export interface FetchStageOptions {
  sourceClass?: SourceClass;
  onlyKeys?: string[];
  fetchedAt?: string;
  userAgent?: string;
}

function filterSources(options: FetchStageOptions): ApprovedSourceDefinition[] {
  const byClass = options.sourceClass
    ? listSourcesByClass(options.sourceClass)
    : listApprovedSources();

  if (!options.onlyKeys?.length) {
    return byClass;
  }

  return byClass.filter((source) => options.onlyKeys?.includes(source.key));
}

export async function runFetchStage(
  options: FetchStageOptions = {}
): Promise<SourceFetchResult[]> {
  const context: SourceFetchContext = {
    fetchedAt: options.fetchedAt ?? new Date().toISOString(),
    userAgent: options.userAgent ?? defaultUserAgent
  };

  const sources = filterSources(options).filter((source) => source.active);

  return Promise.all(sources.map((source) => source.fetch(source, context)));
}
