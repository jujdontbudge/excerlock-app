export interface VendorHttpRequest {
  method: "GET" | "POST" | "DELETE";
  url: string;
  headers?: Readonly<Record<string, string>>;
  body?: string;
}

export interface VendorHttpResponse {
  status: number;
  body: unknown;
}

export interface VendorHttpClient {
  request(request: VendorHttpRequest): Promise<VendorHttpResponse>;
}

export const fetchVendorHttpClient: VendorHttpClient = {
  async request(request) {
    const response = await fetch(request.url, {
      method: request.method,
      ...(request.headers ? { headers: request.headers } : {}),
      ...(request.body !== undefined ? { body: request.body } : {}),
    });
    const responseText = await response.text();
    let body: unknown = responseText;

    if (responseText.length > 0) {
      try {
        body = JSON.parse(responseText) as unknown;
      } catch {
        // Some revoke endpoints intentionally return text or an empty body.
      }
    } else {
      body = null;
    }

    return { status: response.status, body };
  },
};
