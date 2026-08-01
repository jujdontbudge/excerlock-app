import { ClerkAccountModule } from "./ClerkAccountModule";
import { NoopAccountModule } from "./NoopAccountModule";
import type { AccountModule } from "./AccountModule";

let accountModule: AccountModule | undefined;

/**
 * The account composition root. Phase 5 changes only this constructor to a
 * Clerk adapter; callers continue to depend on the vendor-free interface.
 */
export function getAccountModule(): AccountModule {
  accountModule ??= process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
    ? new ClerkAccountModule()
    : new NoopAccountModule();
  return accountModule;
}
