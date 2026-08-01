import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import type { ReactNode } from "react";

import { getAccountModule } from "./accessor";
import { ClerkAccountBridge } from "./ClerkAccountBridge";
import { ClerkAccountModule } from "./ClerkAccountModule";

type AccountRuntimeRootProps = Readonly<{
  account?: ClerkAccountModule;
  children: ReactNode;
  publishableKey?: string;
}>;

/** Selects Clerk only for configured builds and owns credential persistence. */
export function AccountRuntimeRoot({
  account,
  children,
  publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
}: AccountRuntimeRootProps) {
  const configuredKey = publishableKey?.trim();
  if (!configuredKey) {
    return children;
  }

  const configuredAccount = account ?? getAccountModule();
  if (!(configuredAccount instanceof ClerkAccountModule)) {
    return children;
  }

  return (
    <ClerkProvider publishableKey={configuredKey} tokenCache={tokenCache}>
      <ClerkAccountBridge account={configuredAccount}>
        {children}
      </ClerkAccountBridge>
    </ClerkProvider>
  );
}
