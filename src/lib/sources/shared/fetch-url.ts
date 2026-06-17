export interface FetchUrlOptions {
  url: string;
  userAgent?: string;
}

export interface FetchUrlResult {
  url: string;
  status: number;
  ok: boolean;
  body: string;
  contentType: string | null;
}

export async function fetchUrl({ url, userAgent }: FetchUrlOptions): Promise<FetchUrlResult> {
  const response = await fetch(url, {
    headers: userAgent
      ? {
          "user-agent": userAgent
        }
      : undefined
  });

  return {
    url,
    status: response.status,
    ok: response.ok,
    body: await response.text(),
    contentType: response.headers.get("content-type")
  };
}
