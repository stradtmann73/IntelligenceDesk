import {
  buildFetchFailure,
  buildFetchSuccess,
  defineSource,
  type ApprovedSourceDefinition,
  type SourceFetchContext
} from "../shared/source-result.ts";
import { fetchUrl } from "../shared/fetch-url.ts";
import { summarizeText } from "../shared/normalize-html.ts";

export const claudeStatusSource = defineSource({
  key: "claude-status",
  label: "Claude Status",
  owner: "anthropic",
  sourceClass: "status",
  transport: "status_page",
  endpointUrl: "https://status.claude.com/",
  canonicalUrl: "https://status.claude.com/",
  active: true,
  notes: "Official Anthropic service status page.",
  scope: { provider: "claude" },
  fetch: fetchClaudeStatus
});

export async function fetchClaudeStatus(
  source: ApprovedSourceDefinition,
  context: SourceFetchContext
) {
  const response = await fetchUrl({ url: source.endpointUrl, userAgent: context.userAgent });

  if (!response.ok) {
    return buildFetchFailure(source, context, {
      code: "http_error",
      message: `Claude status returned HTTP ${response.status}.`,
      status: response.status
    });
  }

  return buildFetchSuccess(source, context, [
    {
      headline: "Claude status snapshot",
      summary: summarizeText(response.body),
      sourceUrl: source.canonicalUrl,
      rawText: response.body
    }
  ]);
}
