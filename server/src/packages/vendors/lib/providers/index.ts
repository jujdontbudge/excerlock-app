import { ouraAdapter } from "./oura.js";
import { polarAdapter } from "./polar.js";
import { stravaAdapter } from "./strava.js";
import type { VendorProviderAdapter } from "./types.js";
import { whoopAdapter } from "./whoop.js";
import type { Vendor } from "../../../model/vendor.js";

export const VENDOR_ADAPTERS: Readonly<
  Record<Vendor, VendorProviderAdapter>
> = {
  strava: stravaAdapter,
  oura: ouraAdapter,
  whoop: whoopAdapter,
  polar: polarAdapter,
};
