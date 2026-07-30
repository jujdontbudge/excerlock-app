export type SupportHttpResponse = Readonly<{
  status: number;
  body: unknown;
}>;

export type SupportFetch = (
  url: string,
  init: Readonly<{
    body?: string;
    headers: Readonly<Record<string, string>>;
    method: "GET" | "POST";
    signal: AbortSignal;
  }>,
) => Promise<
  Readonly<{
    status: number;
    json(): Promise<unknown>;
  }>
>;

type SupportHttpClientOptions = Readonly<{
  baseUrl: string;
  fetch: SupportFetch;
  getAccessToken(): Promise<string | null>;
  requestTimeoutMs: number;
}>;

export class SupportHttpClient {
  private readonly baseUrl: string;
  private readonly fetch: SupportFetch;
  private readonly getAccessToken: () => Promise<string | null>;
  private readonly requestTimeoutMs: number;

  public constructor(options: SupportHttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.fetch = options.fetch;
    this.getAccessToken = options.getAccessToken;
    this.requestTimeoutMs = options.requestTimeoutMs;
  }

  public async request(
    path: string,
    method: "GET" | "POST",
    body?: Readonly<Record<string, string>>,
  ): Promise<SupportHttpResponse> {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout>;
    const timedOut = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(createTimeoutError());
      }, this.requestTimeoutMs);
    });
    try {
      const token = await Promise.race([this.getAccessToken(), timedOut]);
      const response = await Promise.race([
        this.fetch(`${this.baseUrl}${path}`, {
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          headers: {
            Accept: "application/json",
            ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
            ...(body === undefined
              ? {}
              : { "Content-Type": "application/json" }),
          },
          method,
          signal: controller.signal,
        }),
        timedOut,
      ]);
      let responseBody: unknown = null;
      if (response.status < 400) {
        try {
          responseBody = await Promise.race([response.json(), timedOut]);
        } catch (error) {
          if (isSupportRequestTimeout(error)) {
            throw error;
          }
        }
      }
      return Object.freeze({ status: response.status, body: responseBody });
    } finally {
      clearTimeout(timeout!);
    }
  }
}

export function isSupportRequestTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function createTimeoutError(): Error {
  return Object.assign(new Error("Support request timed out"), {
    name: "AbortError",
  });
}
