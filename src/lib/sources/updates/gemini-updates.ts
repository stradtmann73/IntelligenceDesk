import {
  buildFetchFailure,
  buildFetchSuccess,
  defineSource,
  type ApprovedSourceDefinition,
  type SourceFetchContext
} from "../shared/source-result.ts";
import { fetchUrl } from "../shared/fetch-url.ts";
import { extractRelevantWindow } from "../shared/normalize-html.ts";

const geminiUpdateCues = [
  "release notes",
  "gemini",
  "google ai studio",
  "api",
  "model",
  "updated"
];

export const geminiUpdatesSource = defineSource({
  key: "gemini-release-notes",
  label: "Gemini Release Notes",
  owner: "google",
  sourceClass: "updates",
  transport: "html",
  endpointUrl: "https://gemini.google/release-notes/",
  canonicalUrl: "https://gemini.google/release-notes/",
  active: true,
  notes: "Official Gemini release notes.",
  scope: { provider: "gemini" },
  fetch: fetchGeminiUpdates
});

export async function fetchGeminiUpdates(
  source: ApprovedSourceDefinition,
  context: SourceFetchContext
) {
  const response = await fetchUrl({ url: source.endpointUrl, userAgent: context.userAgent });

  if (!response.ok) {
    return buildFetchFailure(source, context, {
      code: "http_error",
      message: `Gemini release notes returned HTTP ${response.status}.`,
      status: response.status
    });
  }

  return buildFetchSuccess(source, context, [
    {
      headline: "Gemini release notes snapshot",
      summary: extractRelevantWindow(response.body, geminiUpdateCues, 280),
      sourceUrl: source.canonicalUrl,
      rawText: response.body
    }
  ]);
}
