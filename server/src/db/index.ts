export { closeDb, getDb } from "./client.js";
import * as schema from "./schema.js";
export type DatabaseSchema = typeof schema;
export {
  featureRequests,
  featureRequestVotes,
  supportRequests,
  users,
  vendorConnections,
  vendorOAuthStates,
  vendorWebhookEvents,
  type FeatureRequest,
  type FeatureRequestVote,
  type NewFeatureRequest,
  type NewFeatureRequestVote,
  type NewSupportRequest,
  type NewUser,
  type NewVendorConnection,
  type NewVendorOAuthState,
  type NewVendorWebhookEvent,
  type SupportRequest,
  type User,
  type VendorConnection,
  type VendorOAuthState,
  type VendorWebhookEvent,
} from "./schema.js";
