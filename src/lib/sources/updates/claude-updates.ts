import {
  buildFetchFailure,
  buildFetchSuccess,
  defineSource,
  type ApprovedSourceDefinition,
  type SourceFetchContext
} from "../shared/source-result.ts";
import { fetchUrl } from "../shared/fetch-url.ts";
import {
  cleanSourceSummary,
  summarizeText
} from "../shared/normalize-html.ts";

export const claudeUpdatesSource = defineSource({
  key: "claude-release-notes",
  label: "Claude Release Notes",
  owner: "anthropic",
  sourceClass: "updates",
  transport: "html",
  endpointUrl: "https://support.claude.com/en/articles/12138966-release-notes",
  canonicalUrl: "https://support.claude.com/en/articles/12138966-release-notes",
  active: true,
  notes: "Official Claude release notes for product changes.",
  scope: { provider: "claude" },
  fetch: fetchClaudeUpdates
});

export async function fetchClaudeUpdates(
  source: ApprovedSourceDefinition,
  context: SourceFetchContext
) {
  const response = await fetchUrl({ url: source.endpointUrl, userAgent: context.userAgent });

  if (!response.ok) {
    return buildFetchFailure(source, context, {
      code: "http_error",
      message: `Claude release notes returned HTTP ${response.status}.`,
      status: response.status
    });
  }

  const headline = "Claude release notes";
  const description = cleanSourceSummary(
    "Official Anthropic release notes covering Claude product changes, usability improvements, and rollout updates."
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
