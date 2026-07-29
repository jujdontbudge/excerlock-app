import { MockAccountModule } from "./MockAccountModule";
import type { AccountModule } from "./AccountModule";

let accountModule: AccountModule | undefined;

/**
 * The account composition root. Phase 5 changes only this constructor to a
 * Clerk adapter; callers continue to depend on the vendor-free interface.
 */
export function getAccountModule(): AccountModule {
  accountModule ??= new MockAccountModule();
  return accountModule;
}
