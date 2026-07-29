import type { VendorHttpClient } from "../http.js";

export interface ExchangeCodeInput {
  http: VendorHttpClient;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  userId: string;
  grantedScope: string | undefined;
  now: Date;
}

export interface ExchangedVendorTokens {
  accessToken: string;
  refreshToken: string | null;
  accessTokenExpiresAt: Date | null;
  externalUserId: string;
  scopes: string;
}

export interface VendorProviderAdapter {
  exchangeCode(input: ExchangeCodeInput): Promise<ExchangedVendorTokens>;
}

export function formBody(values: Readonly<Record<string, string>>): string {
  return new URLSearchParams(values).toString();
}

export function requireSuccess(
  vendor: string,
  operation: string,
  status: number,
  acceptedStatuses: readonly number[] = [],
): void {
  if (
    (status < 200 || status >= 300) &&
    !acceptedStatuses.includes(status)
  ) {
    throw new Error(
      `${vendor} ${operation} failed with upstream HTTP ${status}`,
    );
  }
}

export function invalidResponse(vendor: string, operation: string): Error {
  return new Error(`${vendor} ${operation} returned an invalid response`);
}
