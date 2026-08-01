import type { ComponentType, ReactNode } from "react";

import { getAccountModule } from "./accessor";
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

  const { ConfiguredClerkRuntimeRoot } = require(
    "./ConfiguredClerkRuntimeRoot",
  ) as {
    ConfiguredClerkRuntimeRoot: ComponentType<{
      account: ClerkAccountModule;
      children: ReactNode;
      publishableKey: string;
    }>;
  };

  return (
    <ConfiguredClerkRuntimeRoot
      account={configuredAccount}
      publishableKey={configuredKey}
    >
      {children}
    </ConfiguredClerkRuntimeRoot>
  );
}
