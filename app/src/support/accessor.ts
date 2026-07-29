import { MockSupportModule } from "./MockSupportModule";
import type { SupportModule } from "./SupportModule";

let supportModule: SupportModule | undefined;

/**
 * The support composition root. The real HTTP adapter replaces only this
 * constructor once the server route contract is implemented.
 */
export function getSupportModule(): SupportModule {
  supportModule ??= new MockSupportModule();
  return supportModule;
}
