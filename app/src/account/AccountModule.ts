export type AccountUser = Readonly<{
  id: string;
  email: string;
}>;

export type SignedInAccountSession = Readonly<{
  status: "signedIn";
  user: AccountUser;
  authenticatedAtMs: number;
}>;

export type AccountSession =
  | Readonly<{ status: "signedOut" }>
  | SignedInAccountSession;

export type AccountError = Readonly<{
  code: "sign_in_failed" | "sign_up_failed";
  message: string;
}>;

export type AccountIntentState =
  | Readonly<{ status: "idle"; error: AccountError | null }>
  | Readonly<{ status: "signingIn"; error: null }>
  | Readonly<{ status: "signingUp"; error: null }>;

export type AccountSnapshot = Readonly<{
  session: AccountSession;
  intent: AccountIntentState;
}>;

export type AuthenticationResult =
  | Readonly<{
      status: "authenticated";
      session: SignedInAccountSession;
    }>
  | Readonly<{ status: "cancelled" }>
  | Readonly<{ status: "failed"; error: AccountError }>;

export type AccountStateListener = (snapshot: AccountSnapshot) => void;
export type AccountUnsubscribe = () => void;

export interface AccountModule {
  getSnapshot(): Promise<AccountSnapshot>;
  signIn(): Promise<AuthenticationResult>;
  signUp(): Promise<AuthenticationResult>;
  subscribe(listener: AccountStateListener): AccountUnsubscribe;
}
