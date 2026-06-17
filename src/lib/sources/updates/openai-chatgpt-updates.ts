import {
  buildFetchFailure,
  buildFetchSuccess,
  defineSource,
  type ApprovedSourceDefinition,
  type SourceFetchContext
} from "../shared/source-result.ts";
import { fetchUrl } from "../shared/fetch-url.ts";
import { extractRelevantWindow } from "../shared/normalize-html.ts";

const chatgptUpdateCues = [
  "chatgpt release notes",
  "chatgpt",
  "release notes",
  "new",
  "updated",
  "rollout"
];

export const openaiChatgptUpdatesSource = defineSource({
  key: "openai-chatgpt-release-notes",
  label: "ChatGPT Release Notes",
  owner: "openai",
  sourceClass: "updates",
  transport: "html",
  endpointUrl: "https://help.openai.com/en/articles/6825453-chatgpt-release-notes",
  canonicalUrl: "https://help.openai.com/en/articles/6825453-chatgpt-release-notes",
  active: true,
  notes: "Official ChatGPT release notes from OpenAI Help Center.",
  scope: { provider: "openai" },
  fetch: fetchOpenaiChatgptUpdates
});

export async function fetchOpenaiChatgptUpdates(
  source: ApprovedSourceDefinition,
  context: SourceFetchContext
) {
  const response = await fetchUrl({ url: source.endpointUrl, userAgent: context.userAgent });

  if (!response.ok) {
    return buildFetchFailure(source, context, {
      code: "http_error",
      message: `ChatGPT release notes returned HTTP ${response.status}.`,
      status: response.status
    });
  }

  return buildFetchSuccess(source, context, [
    {
      headline: "ChatGPT release notes snapshot",
      summary: extractRelevantWindow(response.body, chatgptUpdateCues, 280),
      sourceUrl: source.canonicalUrl,
      rawText: response.body
    }
  ]);
}
