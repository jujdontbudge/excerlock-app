import {
  SystemAccountClock,
  type AccountClock,
} from "./clock";
import type {
  AccountModule,
  AccountError,
  AccountSnapshot,
  AccountStateListener,
  AccountUnsubscribe,
  AuthenticationResult,
  SignedInAccountSession,
  SignOutResult,
} from "./AccountModule";

const INITIAL_SNAPSHOT: AccountSnapshot = Object.freeze({
  session: Object.freeze({ status: "signedOut" }),
  intent: Object.freeze({ status: "idle", error: null }),
});

type MockAccountModuleOptions = Readonly<{
  clock?: AccountClock;
}>;

type MockAuthenticationResult =
  | "authenticated"
  | "cancelled"
  | Readonly<{ status: "failed"; message: string }>;

export class MockAccountModule implements AccountModule {
  private readonly clock: AccountClock;
  private snapshot = INITIAL_SNAPSHOT;
  private nextSignInResult: MockAuthenticationResult = "authenticated";
  private nextSignUpResult: MockAuthenticationResult = "authenticated";
  private readonly listeners = new Set<AccountStateListener>();

  public constructor(options: MockAccountModuleOptions = {}) {
    this.clock = options.clock ?? new SystemAccountClock();
  }

  public async getSnapshot(): Promise<AccountSnapshot> {
    return this.snapshot;
  }

  public async signIn(): Promise<AuthenticationResult> {
    this.publish({
      ...this.snapshot,
      intent: Object.freeze({ status: "signingIn", error: null }),
    });
    await Promise.resolve();

    if (this.nextSignInResult === "cancelled") {
      this.publish({
        ...this.snapshot,
        intent: Object.freeze({ status: "idle", error: null }),
      });
      return Object.freeze({ status: "cancelled" });
    }
    if (typeof this.nextSignInResult === "object") {
      const error: AccountError = Object.freeze({
        code: "sign_in_failed",
        message: this.nextSignInResult.message,
      });
      this.publish({
        ...this.snapshot,
        intent: Object.freeze({ status: "idle", error }),
      });
      return Object.freeze({ status: "failed", error });
    }

    const session: SignedInAccountSession = Object.freeze({
      status: "signedIn",
      authenticatedAtMs: this.clock.nowMs(),
      user: Object.freeze({
        id: "mock_returning_user",
        email: "member@excerlock.test",
      }),
    });
    this.publish({
      session,
      intent: Object.freeze({ status: "idle", error: null }),
    });
    return Object.freeze({ status: "authenticated", session });
  }

  public async signUp(): Promise<AuthenticationResult> {
    this.publish({
      ...this.snapshot,
      intent: Object.freeze({ status: "signingUp", error: null }),
    });
    await Promise.resolve();

    if (this.nextSignUpResult === "cancelled") {
      this.publish({
        ...this.snapshot,
        intent: Object.freeze({ status: "idle", error: null }),
      });
      return Object.freeze({ status: "cancelled" });
    }
    if (typeof this.nextSignUpResult === "object") {
      const error: AccountError = Object.freeze({
        code: "sign_up_failed",
        message: this.nextSignUpResult.message,
      });
      this.publish({
        ...this.snapshot,
        intent: Object.freeze({ status: "idle", error }),
      });
      return Object.freeze({ status: "failed", error });
    }

    const session: SignedInAccountSession = Object.freeze({
      status: "signedIn",
      authenticatedAtMs: this.clock.nowMs(),
      user: Object.freeze({
        id: "mock_new_user",
        email: "new-member@excerlock.test",
      }),
    });
    this.publish({
      session,
      intent: Object.freeze({ status: "idle", error: null }),
    });
    return Object.freeze({ status: "authenticated", session });
  }

  public async signOut(): Promise<SignOutResult> {
    this.publish({
      ...this.snapshot,
      intent: Object.freeze({ status: "signingOut", error: null }),
    });
    await Promise.resolve();

    this.publish({
      session: Object.freeze({ status: "signedOut" }),
      intent: Object.freeze({ status: "idle", error: null }),
    });
    return Object.freeze({ status: "signedOut" });
  }

  /** Deterministic mock driver; not part of the app-facing interface. */
  public setNextSignInResult(result: MockAuthenticationResult): void {
    this.nextSignInResult = result;
  }

  /** Deterministic mock driver; not part of the app-facing interface. */
  public setNextSignUpResult(result: MockAuthenticationResult): void {
    this.nextSignUpResult = result;
  }

  public subscribe(listener: AccountStateListener): AccountUnsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private publish(snapshot: AccountSnapshot): void {
    this.snapshot = Object.freeze(snapshot);
    this.listeners.forEach((listener) => listener(this.snapshot));
  }
}
