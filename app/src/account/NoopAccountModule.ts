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

export class NoopAccountModule implements AccountModule {
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
      "Account sign-in is unavailable in this build.",
    );
  }

  public async signUp(): Promise<AuthenticationResult> {
    return this.authenticationUnavailable(
      "sign_up_failed",
      "Account creation is unavailable in this build.",
    );
  }

  public async signOut(): Promise<SignOutResult> {
    return Object.freeze({ status: "signedOut" });
  }

  public async deleteAccount(): Promise<AccountDeletionResult> {
    const error = Object.freeze({
      code: "account_deletion_failed" as const,
      message: "Account deletion is unavailable in this build.",
    });
    this.publishError(error);
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
    const error = Object.freeze({ code, message });
    this.publishError(error);
    return Object.freeze({ status: "failed", error });
  }

  private publishError(error: AccountError): void {
    this.snapshot = Object.freeze({
      session: SIGNED_OUT,
      intent: Object.freeze({ status: "idle", error }),
    });
    this.listeners.forEach((listener) => listener(this.snapshot));
  }
}
