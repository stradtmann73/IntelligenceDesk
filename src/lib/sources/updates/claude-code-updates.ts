import {
  buildFetchFailure,
  buildFetchSuccess,
  defineSource,
  type ApprovedSourceDefinition,
  type SourceFetchContext
} from "../shared/source-result.ts";
import { fetchUrl } from "../shared/fetch-url.ts";
import {
  cleanHeadlineText,
  cleanSourceSummary,
  extractMetaContent,
  extractTitleTag,
  summarizeText
} from "../shared/normalize-html.ts";

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

  const headline =
    cleanHeadlineText(extractTitleTag(response.body) ?? "Claude Code what's new")
      .replace(/\s*-\s*Claude Code Docs/i, "")
      .trim() || "Claude Code what's new";

  const description = cleanSourceSummary(
    extractMetaContent(response.body, ["description", "og:description"]) ??
    "Official Claude Code digest covering recent tooling features, demos, and workflow improvements."
  );

  return buildFetchSuccess(source, context, [
    {
      headline,
      summary: summarizeText(description, 220),
      sourceUrl: source.canonicalUrl,
      rawText: response.body
    }
  ]);
}
