import {
  buildFetchFailure,
  buildFetchSuccess,
  defineSource,
  type ApprovedSourceDefinition,
  type SourceFetchContext
} from "../shared/source-result.ts";
import { fetchUrl } from "../shared/fetch-url.ts";
import { extractRelevantWindow } from "../shared/normalize-html.ts";

const claudeCodeUpdateCues = [
  "what's new",
  "claude code",
  "release",
  "updated",
  "model",
  "tool"
];

export const claudeCodeUpdatesSource = defineSource({
  key: "claude-code-whats-new",
  label: "Claude Code What's New",
  owner: "anthropic",
  sourceClass: "updates",
  transport: "html",
  endpointUrl: "https://code.claude.com/docs/en/whats-new",
  canonicalUrl: "https://code.claude.com/docs/en/whats-new",
  active: true,
  notes: "Official Claude Code what's new page.",
  scope: { provider: "claude" },
  fetch: fetchClaudeCodeUpdates
});

export async function fetchClaudeCodeUpdates(
  source: ApprovedSourceDefinition,
  context: SourceFetchContext
) {
  const response = await fetchUrl({ url: source.endpointUrl, userAgent: context.userAgent });

  if (!response.ok) {
    return buildFetchFailure(source, context, {
      code: "http_error",
      message: `Claude Code updates returned HTTP ${response.status}.`,
      status: response.status
    });
  }

  return buildFetchSuccess(source, context, [
    {
      headline: "Claude Code what's new snapshot",
      summary: extractRelevantWindow(response.body, claudeCodeUpdateCues, 280),
      sourceUrl: source.canonicalUrl,
      rawText: response.body
    }
  ]);
}
