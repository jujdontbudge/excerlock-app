import { NativeShareCardModule } from "./NativeShareCardModule";
import type { ShareCardModule } from "./ShareCardModule";

let shareCardModule: ShareCardModule | undefined;

/** The sole composition root for the production share-card adapter. */
export function getShareCardModule(): ShareCardModule {
  shareCardModule ??= new NativeShareCardModule();
  return shareCardModule;
}
