import { HttpSupportModule } from "./HttpSupportModule";
import { MockSupportModule } from "./MockSupportModule";
import type { SupportClock } from "./clock";
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

/** Composition-root injection for build-selected support adapters. */
export function installSupportModule(module: SupportModule): () => void {
  const previous = supportModule;
  supportModule = module;

  return () => {
    if (supportModule === module) {
      supportModule = previous;
    }
  };
}

/** Installs the deterministic online adapter for a selected E2E scenario. */
export function installFixtureSupportModule({
  clock,
}: Readonly<{ clock: SupportClock }>): () => void {
  return installSupportModule(new MockSupportModule({ clock }));
}
