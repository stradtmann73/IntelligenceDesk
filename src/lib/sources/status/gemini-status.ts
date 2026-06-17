import {
  buildFetchFailure,
  buildFetchSuccess,
  defineSource,
  type ApprovedSourceDefinition,
  type SourceFetchContext
} from "../shared/source-result.ts";
import { fetchUrl } from "../shared/fetch-url.ts";
import { summarizeText } from "../shared/normalize-html.ts";

export const geminiStatusSource = defineSource({
  key: "gemini-status",
  label: "Gemini API Status",
  owner: "google",
  sourceClass: "status",
  transport: "html",
  endpointUrl: "https://status.cloud.google.com/",
  canonicalUrl: "https://status.cloud.google.com/",
  active: true,
  notes: "Google Cloud service health page used as the official status source for Gemini API monitoring.",
  scope: { provider: "gemini" },
  fetch: fetchGeminiStatus
});

export async function fetchGeminiStatus(
  source: ApprovedSourceDefinition,
  context: SourceFetchContext
) {
  const response = await fetchUrl({ url: source.endpointUrl, userAgent: context.userAgent });

  if (!response.ok) {
    return buildFetchFailure(source, context, {
      code: "http_error",
      message: `Gemini status returned HTTP ${response.status}.`,
      status: response.status
    });
  }

  return buildFetchSuccess(source, context, [
    {
      headline: "Gemini status snapshot",
      summary: summarizeText(response.body),
      sourceUrl: source.canonicalUrl,
      rawText: response.body
    }
  ]);
}
