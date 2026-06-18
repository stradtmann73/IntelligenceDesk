import {
  buildFetchFailure,
  buildFetchSuccess,
  defineSource,
  type ApprovedSourceDefinition,
  type SourceFetchContext
} from "../shared/source-result.ts";
import { fetchUrl } from "../shared/fetch-url.ts";
import { cleanSourceSummary, summarizeText } from "../shared/normalize-html.ts";

interface GoogleIncidentProduct {
  title?: string;
}

interface GoogleIncidentUpdate {
  text?: string;
  when?: string;
  status?: string;
}

interface GoogleIncident {
  external_desc?: string;
  affected_products?: GoogleIncidentProduct[];
  most_recent_update?: GoogleIncidentUpdate;
  updates?: GoogleIncidentUpdate[];
  modified?: string;
  uri?: string;
}

function isGeminiIncident(incident: GoogleIncident): boolean {
  const products = incident.affected_products ?? [];
  return products.some((product) => /gemini/i.test(product.title ?? ""));
}

function buildGeminiFallbackSummary(): string {
  return "No active Gemini API incident is visible in the official Google Cloud incident feed in this snapshot.";
}

export const geminiStatusSource = defineSource({
  key: "gemini-status",
  label: "Gemini API Status",
  owner: "google",
  sourceClass: "status",
  transport: "html",
  endpointUrl: "https://status.cloud.google.com/incidents.json",
  canonicalUrl: "https://status.cloud.google.com/incidents.json",
  active: true,
  notes: "Google Cloud incident feed filtered for Gemini-related products.",
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

  let incidents: GoogleIncident[];
  try {
    incidents = JSON.parse(response.body) as GoogleIncident[];
  } catch {
    return buildFetchFailure(source, context, {
      code: "parse_error",
      message: "Gemini status incident feed could not be parsed."
    });
  }

  const geminiIncidents = incidents.filter(isGeminiIncident);
  const activeIncident = geminiIncidents.find((incident) => {
    const text = cleanSourceSummary(incident.most_recent_update?.text ?? incident.external_desc ?? "");
    return !/issue has been resolved|service restoration was confirmed|all services were back to stable state/i.test(text);
  });

  if (!activeIncident) {
    return buildFetchSuccess(source, context, [
      {
        headline: "Gemini status",
        summary: buildGeminiFallbackSummary(),
        sourceUrl: source.canonicalUrl
      }
    ]);
  }

  const latestText = cleanSourceSummary(
    activeIncident.most_recent_update?.text ??
    activeIncident.updates?.[0]?.text ??
    activeIncident.external_desc ??
    ""
  )
    .replace(/^summary\s*/i, "")
    .replace(/^description\s*/i, "")
    .replace(/^symptoms\s*/i, "")
    .replace(/^workaround\s*/i, "")
    .trim();

  return buildFetchSuccess(source, context, [
    {
      headline: "Gemini status",
      summary: summarizeText(latestText || buildGeminiFallbackSummary(), 220),
      sourceUrl: activeIncident.uri
        ? new URL(activeIncident.uri, "https://status.cloud.google.com/").toString()
        : source.canonicalUrl,
      publishedAt: activeIncident.modified ?? activeIncident.most_recent_update?.when ?? null,
      rawText: activeIncident.most_recent_update?.text ?? activeIncident.external_desc ?? response.body
    }
  ]);
}
