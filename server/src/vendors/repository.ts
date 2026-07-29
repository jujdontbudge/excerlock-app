import type { Vendor } from "./types.js";

export interface NewVendorOAuthStateRecord {
  stateHash: string;
  userId: string;
  vendor: Vendor;
  expiresAt: Date;
}

export interface VendorOAuthStateRepository {
  saveOAuthState(state: NewVendorOAuthStateRecord): Promise<void>;
}
