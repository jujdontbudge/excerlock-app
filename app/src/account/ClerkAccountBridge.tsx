import { useClerk, useSSO, useUser } from "@clerk/clerk-expo";
import { useEffect, type ReactNode } from "react";

import { ClerkAccountModule } from "./ClerkAccountModule";

type ClerkAccountBridgeProps = Readonly<{
  account: ClerkAccountModule;
  children: ReactNode;
}>;

/** Translates Clerk's hook-shaped runtime into the app's class boundary. */
export function ClerkAccountBridge({
  account,
  children,
}: ClerkAccountBridgeProps) {
  const clerk = useClerk();
  const { startSSOFlow } = useSSO();
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    account.attachRuntime({
      authenticate: async () => {
        const result = await startSSOFlow({
          strategy: "oauth_google",
          redirectUrl: "excerlock://sso-callback",
        });
        if (
          result.authSessionResult !== null &&
          result.authSessionResult.type !== "success"
        ) {
          return Object.freeze({ status: "cancelled" as const });
        }
        if (!result.createdSessionId || !result.setActive) {
          throw new Error("Clerk SSO did not create a session");
        }

        await result.setActive({ session: result.createdSessionId });
        const session = clerk.client?.sessions.find(
          ({ id }) => id === result.createdSessionId,
        );
        if (!session?.user) {
          throw new Error("Clerk did not expose the activated session");
        }
        return Object.freeze({
          status: "authenticated" as const,
          user: clerkUser(session.user),
        });
      },
      signOut: () => clerk.signOut(),
      deleteAccount: async () => {
        if (!clerk.user) {
          throw new Error("Clerk has no active user to delete");
        }
        await clerk.user.delete();
      },
    });

    if (isSignedIn && user) {
      account.synchronizeUser(clerkUser(user));
    }
  }, [account, clerk, isLoaded, isSignedIn, startSSOFlow, user]);

  return children;
}

function clerkUser(user: {
  id: string;
  primaryEmailAddress: { emailAddress: string } | null;
  emailAddresses: readonly { emailAddress: string }[];
  lastSignInAt: Date | null;
}) {
  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress;
  if (!email) {
    throw new Error("Clerk user has no email address");
  }
  return Object.freeze({
    id: user.id,
    email,
    authenticatedAtMs: user.lastSignInAt?.getTime() ?? Date.now(),
  });
}
