import { bloombergNewsSource } from "./news/bloomberg-news.ts";
import { cnbcBroadNewsSource } from "./news/cnbc-broad-news.ts";
import { cnbcNewsSource } from "./news/cnbc-news.ts";
import { techcrunchNewsSource } from "./news/techcrunch-news.ts";
import { yahooAiNewsSource } from "./news/yahoo-ai-news.ts";
import { claudeStatusSource } from "./status/claude-status.ts";
import { geminiStatusSource } from "./status/gemini-status.ts";
import { openaiStatusSource } from "./status/openai-status.ts";
import { claudeCodeUpdatesSource } from "./updates/claude-code-updates.ts";
import { claudeUpdatesSource } from "./updates/claude-updates.ts";
import { geminiUpdatesSource } from "./updates/gemini-updates.ts";
import { openaiChatgptUpdatesSource } from "./updates/openai-chatgpt-updates.ts";
import { openaiUpdatesSource } from "./updates/openai-updates.ts";
import type { ApprovedSourceDefinition, SourceClass } from "./shared/source-result.ts";

export const approvedSources = [
  openaiStatusSource,
  geminiStatusSource,
  claudeStatusSource,
  openaiUpdatesSource,
  openaiChatgptUpdatesSource,
  geminiUpdatesSource,
  claudeUpdatesSource,
  claudeCodeUpdatesSource,
  cnbcNewsSource,
  cnbcBroadNewsSource,
  bloombergNewsSource,
  techcrunchNewsSource,
  yahooAiNewsSource
] as const satisfies readonly ApprovedSourceDefinition[];

export function listApprovedSources(): ApprovedSourceDefinition[] {
  return [...approvedSources];
}

export function listSourcesByClass(sourceClass: SourceClass): ApprovedSourceDefinition[] {
  return approvedSources.filter((source) => source.sourceClass === sourceClass);
}

export function getSourceByKey(sourceKey: string): ApprovedSourceDefinition | undefined {
  return approvedSources.find((source) => source.key === sourceKey);
}
