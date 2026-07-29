import type { Vendor } from "./types.js";

export interface NewVendorOAuthStateRecord {
  stateHash: string;
  userId: string;
  vendor: Vendor;
  expiresAt: Date;
}

export interface NewVendorConnectionRecord {
  id: string;
  userId: string;
  vendor: Vendor;
  externalUserId: string;
  accessTokenCiphertext: string;
  refreshTokenCiphertext: string | null;
  accessTokenExpiresAt: Date | null;
  scopes: string;
}

export interface NewVendorTokenRecord {
  accessTokenCiphertext: string;
  refreshTokenCiphertext: string;
  accessTokenExpiresAt: Date;
}

export interface VendorOAuthStateRepository {
  saveOAuthState(state: NewVendorOAuthStateRecord): Promise<void>;
  consumeOAuthState(
    stateHash: string,
    vendor: Vendor,
    now: Date,
  ): Promise<NewVendorOAuthStateRecord | null>;
  upsertConnection(connection: NewVendorConnectionRecord): Promise<void>;
  findConnection(
    userId: string,
    vendor: Vendor,
  ): Promise<NewVendorConnectionRecord | null>;
  updateConnectionTokens(
    connectionId: string,
    tokens: NewVendorTokenRecord,
  ): Promise<void>;
}
