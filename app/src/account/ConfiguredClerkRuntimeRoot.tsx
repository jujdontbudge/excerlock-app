import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import type { ReactNode } from "react";

import { ClerkAccountBridge } from "./ClerkAccountBridge";
import type { ClerkAccountModule } from "./ClerkAccountModule";

type ConfiguredClerkRuntimeRootProps = Readonly<{
  account: ClerkAccountModule;
  children: ReactNode;
  publishableKey: string;
}>;

/** Clerk-only leaf, loaded after AccountRuntimeRoot validates configuration. */
export function ConfiguredClerkRuntimeRoot({
  account,
  children,
  publishableKey,
}: ConfiguredClerkRuntimeRootProps) {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkAccountBridge account={account}>{children}</ClerkAccountBridge>
    </ClerkProvider>
  );
}
