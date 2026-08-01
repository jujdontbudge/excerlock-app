import type {
  AccountDeletionResult,
  AccountError,
  AccountModule,
  AccountSnapshot,
  AccountStateListener,
  AccountUnsubscribe,
  AuthenticationResult,
  SignedInAccountSession,
  SignOutResult,
} from "./AccountModule";

const SIGNED_OUT = Object.freeze({ status: "signedOut" as const });

type ClerkRuntimeUser = Readonly<{
  id: string;
  email: string;
  authenticatedAtMs: number;
}>;

export type ClerkAccountRuntime = Readonly<{
  authenticate: () => Promise<
    | Readonly<{ status: "authenticated"; user: ClerkRuntimeUser }>
    | Readonly<{ status: "cancelled" }>
  >;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}>;

/**
 * Vendor adapter selected for configured builds. The React bridge attaches the
 * loaded Clerk runtime before any account action can succeed.
 */
export class ClerkAccountModule implements AccountModule {
  private readonly listeners = new Set<AccountStateListener>();
  private runtime: ClerkAccountRuntime | null = null;
  private snapshot: AccountSnapshot = Object.freeze({
    session: SIGNED_OUT,
    intent: Object.freeze({ status: "idle", error: null }),
  });

  public async getSnapshot(): Promise<AccountSnapshot> {
    return this.snapshot;
  }

  public async signIn(): Promise<AuthenticationResult> {
    if (this.runtime === null) {
      return this.authenticationUnavailable(
        "sign_in_failed",
        "Account sign-in is still loading. Please try again.",
      );
    }

    this.publish({
      ...this.snapshot,
      intent: Object.freeze({ status: "signingIn", error: null }),
    });
    let result: Awaited<ReturnType<ClerkAccountRuntime["authenticate"]>>;
    try {
      result = await this.runtime.authenticate();
    } catch {
      return this.authenticationUnavailable(
        "sign_in_failed",
        "We couldn't sign you in. Please try again.",
      );
    }
    if (result.status === "cancelled") {
      this.publish({
        ...this.snapshot,
        intent: Object.freeze({ status: "idle", error: null }),
      });
      return Object.freeze({ status: "cancelled" });
    }
    const session: SignedInAccountSession = Object.freeze({
      status: "signedIn",
      authenticatedAtMs: result.user.authenticatedAtMs,
      user: Object.freeze({ id: result.user.id, email: result.user.email }),
    });
    this.publish({
      session,
      intent: Object.freeze({ status: "idle", error: null }),
    });
    return Object.freeze({ status: "authenticated", session });
  }

  public async signUp(): Promise<AuthenticationResult> {
    if (this.runtime === null) {
      return this.authenticationUnavailable(
        "sign_up_failed",
        "Account creation is still loading. Please try again.",
      );
    }

    this.publish({
      ...this.snapshot,
      intent: Object.freeze({ status: "signingUp", error: null }),
    });
    const result = await this.runtime.authenticate();
    if (result.status === "cancelled") {
      this.publish({
        ...this.snapshot,
        intent: Object.freeze({ status: "idle", error: null }),
      });
      return Object.freeze({ status: "cancelled" });
    }
    const session: SignedInAccountSession = Object.freeze({
      status: "signedIn",
      authenticatedAtMs: result.user.authenticatedAtMs,
      user: Object.freeze({ id: result.user.id, email: result.user.email }),
    });
    this.publish({
      session,
      intent: Object.freeze({ status: "idle", error: null }),
    });
    return Object.freeze({ status: "authenticated", session });
  }

  public async signOut(): Promise<SignOutResult> {
    const error = this.publishError(
      "sign_out_failed",
      "Account sign-out is still loading. Please try again.",
    );
    return Object.freeze({ status: "failed", error });
  }

  public async deleteAccount(): Promise<AccountDeletionResult> {
    const error = this.publishError(
      "account_deletion_failed",
      "Account deletion is still loading. Please try again.",
    );
    return Object.freeze({ status: "failed", error });
  }

  public subscribe(listener: AccountStateListener): AccountUnsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public attachRuntime(runtime: ClerkAccountRuntime): void {
    this.runtime = runtime;
  }

  private authenticationUnavailable(
    code: "sign_in_failed" | "sign_up_failed",
    message: string,
  ): AuthenticationResult {
    const error = this.publishError(code, message);
    return Object.freeze({ status: "failed", error });
  }

  private publishError(
    code: AccountError["code"],
    message: string,
  ): AccountError {
    const error = Object.freeze({ code, message });
    this.snapshot = Object.freeze({
      session: this.snapshot.session,
      intent: Object.freeze({ status: "idle", error }),
    });
    this.listeners.forEach((listener) => listener(this.snapshot));
    return error;
  }

  private publish(snapshot: AccountSnapshot): void {
    this.snapshot = Object.freeze(snapshot);
    this.listeners.forEach((listener) => listener(this.snapshot));
  }
}
