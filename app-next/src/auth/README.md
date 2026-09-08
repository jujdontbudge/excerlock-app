# Auth

The real `AuthPort`. Supabase owns identity (D1: auth only, no tables, no RLS, no Edge Functions);
the VPS owns the `users` row; `state/sessionStore` is what the screens read. Nothing above this
folder knows that Supabase exists.

## The identity spine

One id, from first launch to sign-in and past it:

| Step                                 | What happens                                                    | User id   |
| ------------------------------------ | --------------------------------------------------------------- | --------- |
| First launch                         | `signInAnonymously()`, then `PUT /v1/user`                      | minted    |
| Sign in with Apple / Google          | `linkIdentity({ provider, token })` onto the anonymous user     | unchanged |
| Sign in with an email code           | `updateUser({ email })`, then `verifyOtp(type: 'email_change')` | unchanged |
| That provider account already exists | `signInWithIdToken` into the account that owns it               | switches  |
| Sign out, delete account             | a brand-new anonymous session                                   | new       |

The one id switch is deliberate. Linking is refused when the Apple or Google account already belongs
to a user, and the alternative — refusing the sign-in — would strand a real account behind a throwaway
anonymous one.

Sign-in methods are Apple, Google and email (B18). Both social sheets are native and hand back an
OIDC id token; there is no browser redirect, so `signInWithOAuth` is unused. Email is always a
six-digit code, never a link, which is why both email templates must carry `{{ .Token }}`.

## Laws

- **The server row comes first.** A sign-in is reported only after `PUT /v1/user` succeeds, so no
  screen shows an account the server has not seen. `410 ACCOUNT_DELETED` is terminal: the stale
  session is dropped and a clean anonymous one starts. Both rules are ported from the old Clerk
  bridge (`app/src/account/ClerkAccountBridge.tsx`).
- **The anonymous bootstrap is the exception.** It publishes first and provisions after, because
  earning and locking must work with no network and no account at all.
- **Tokens live in the keychain and nowhere else.** `secureSessionStorage` splits the session across
  keychain items rather than encrypting it into AsyncStorage, which is the workaround the Supabase
  docs suggest and this app does not take. No file here logs. `__tests__/token-hygiene.test.ts`
  enforces both on the source.
- **Signing out is not deleting.** Every account exit ends on a fresh anonymous session and touches
  no rule, no day and no setting. The SDK teardown order (subscription, analytics, auth last) lives
  in `domain/identity`, above this module.
- **A keyless build still runs.** No Supabase keys means `supabaseAuth()` returns `null` and the app
  keeps its local session.

## Files

| File                      | Responsibility                                                             |
| ------------------------- | -------------------------------------------------------------------------- |
| `SupabaseAuthAdapter.ts`  | the port: bootstrap, link-or-sign-in, OTP, sign-out, deletion, publication |
| `supabaseAuthApi.ts`      | the narrow slice of supabase-js this module depends on                     |
| `supabaseClient.ts`       | the one `createClient` call, and the build's configuration                 |
| `secureSessionStorage.ts` | chunked keychain storage for the session                                   |
| `accountProvisioning.ts`  | `PUT` / `DELETE /v1/user` and the `410` outcome                            |
| `identityProviders.ts`    | the Apple and Google sheets reduced to "id token, or cancelled"            |

## Configuration

`app.config.ts` reads `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (or the legacy `SUPABASE_ANON_KEY`),
`EXPO_PUBLIC_API_URL` and the two Google client ids from the environment, falling back to
`~/.excerlock/env`, and publishes them as `extra.clientAuth`. `SUPABASE_SERVICE_ROLE_KEY` is
server-only and never reaches the bundle.

## Test

```sh
npm test -- src/auth
```

`ports/__tests__/authContract.ts` is the suite the fake and this adapter both pass. The adapter's own
tests drive `__tests__/supabaseDouble.ts`, an in-memory GoTrue that models users, identities and the
already-linked refusal, so every branch runs without a project or a network.

## Open

- Google sign-in is dark until Johan creates the Web and iOS OAuth clients. Without
  `GOOGLE_OAUTH_WEB_CLIENT_ID` the sheet refuses to open and the screen shows its sign-in error,
  `[auth.external.google]` stays disabled on the project, and the config plugin that writes the iOS
  URL scheme is only added once `GOOGLE_OAUTH_IOS_CLIENT_ID` exists.
- Email OTP needs custom SMTP on the Supabase project before the code email can be sent at all.
