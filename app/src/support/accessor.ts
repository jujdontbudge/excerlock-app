import { HttpSupportModule } from "./HttpSupportModule";
import type { SupportModule } from "./SupportModule";

let supportModule: SupportModule | undefined;

/**
 * The support composition root. Auth wiring may replace the keyless token
 * provider without changing support callers.
 */
export function getSupportModule(): SupportModule {
  supportModule ??= new HttpSupportModule({
    baseUrl: process.env.EXPO_PUBLIC_API_URL?.trim() ?? "",
    getAccessToken: async () => null,
  });
  return supportModule;
}
