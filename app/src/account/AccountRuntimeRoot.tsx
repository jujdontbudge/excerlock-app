import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import type { ReactNode } from "react";

type AccountRuntimeRootProps = Readonly<{
  children: ReactNode;
  publishableKey?: string;
}>;

/** Selects Clerk only for configured builds and owns credential persistence. */
export function AccountRuntimeRoot({
  children,
  publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
}: AccountRuntimeRootProps) {
  const configuredKey = publishableKey?.trim();
  if (!configuredKey) {
    return children;
  }

  return (
    <ClerkProvider publishableKey={configuredKey} tokenCache={tokenCache}>
      {children}
    </ClerkProvider>
  );
}
