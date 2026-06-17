import {
  buildFetchFailure,
  buildFetchSuccess,
  defineSource,
  type ApprovedSourceDefinition,
  type SourceFetchContext
} from "../shared/source-result.ts";
import { fetchUrl } from "../shared/fetch-url.ts";
import { summarizeText } from "../shared/normalize-html.ts";

export const openaiStatusSource = defineSource({
  key: "openai-status",
  label: "OpenAI Status",
  owner: "openai",
  sourceClass: "status",
  transport: "status_page",
  endpointUrl: "https://status.openai.com/",
  canonicalUrl: "https://status.openai.com/",
  active: true,
  notes: "Official provider status page for OpenAI services.",
  scope: { provider: "openai" },
  fetch: fetchOpenaiStatus
});

export async function fetchOpenaiStatus(
  source: ApprovedSourceDefinition,
  context: SourceFetchContext
) {
  const response = await fetchUrl({ url: source.endpointUrl, userAgent: context.userAgent });

  if (!response.ok) {
    return buildFetchFailure(source, context, {
      code: "http_error",
      message: `OpenAI status returned HTTP ${response.status}.`,
      status: response.status
    });
  }

  return buildFetchSuccess(source, context, [
    {
      headline: "OpenAI status snapshot",
      summary: summarizeText(response.body),
      sourceUrl: source.canonicalUrl,
      rawText: response.body
    }
  ]);
}
