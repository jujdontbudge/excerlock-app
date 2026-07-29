import {
  SystemAccountClock,
  type AccountClock,
} from "./clock";
import type {
  AccountModule,
  AccountSnapshot,
  AccountStateListener,
  AccountUnsubscribe,
  AuthenticationResult,
  SignedInAccountSession,
} from "./AccountModule";

const INITIAL_SNAPSHOT: AccountSnapshot = Object.freeze({
  session: Object.freeze({ status: "signedOut" }),
  intent: Object.freeze({ status: "idle", error: null }),
});

type MockAccountModuleOptions = Readonly<{
  clock?: AccountClock;
}>;

export class MockAccountModule implements AccountModule {
  private readonly clock: AccountClock;
  private snapshot = INITIAL_SNAPSHOT;
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

  public subscribe(listener: AccountStateListener): AccountUnsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private publish(snapshot: AccountSnapshot): void {
    this.snapshot = Object.freeze(snapshot);
    this.listeners.forEach((listener) => listener(this.snapshot));
  }
}
