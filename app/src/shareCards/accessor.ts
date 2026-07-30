import { MockShareCardModule } from "./MockShareCardModule";
import type { ShareCardModule } from "./ShareCardModule";

let shareCardModule: ShareCardModule | undefined;

/**
 * The share-card composition root. Replacing this constructor is the one-line
 * swap when Expo can install the real capture and native-share adapter.
 */
export function getShareCardModule(): ShareCardModule {
  shareCardModule ??= new MockShareCardModule();
  return shareCardModule;
}
