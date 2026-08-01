import type {
  AccountDeletionResult,
  AccountError,
  AccountModule,
  AccountSnapshot,
  AccountStateListener,
  AccountUnsubscribe,
  AuthenticationResult,
  SignOutResult,
} from "./AccountModule";

const SIGNED_OUT = Object.freeze({ status: "signedOut" as const });

/**
 * Vendor adapter selected for configured builds. The React bridge attaches the
 * loaded Clerk runtime before any account action can succeed.
 */
export class ClerkAccountModule implements AccountModule {
  private readonly listeners = new Set<AccountStateListener>();
  private snapshot: AccountSnapshot = Object.freeze({
    session: SIGNED_OUT,
    intent: Object.freeze({ status: "idle", error: null }),
  });

  public async getSnapshot(): Promise<AccountSnapshot> {
    return this.snapshot;
  }

  public async signIn(): Promise<AuthenticationResult> {
    return this.authenticationUnavailable(
      "sign_in_failed",
      "Account sign-in is still loading. Please try again.",
    );
  }

  public async signUp(): Promise<AuthenticationResult> {
    return this.authenticationUnavailable(
      "sign_up_failed",
      "Account creation is still loading. Please try again.",
    );
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
}
