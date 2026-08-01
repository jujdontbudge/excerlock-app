# Vendor developer-portal signups — Johan's checklist (#24)

Four portals need a human with an account. Everything after — storing the
credentials, wiring the flows, webhooks — is agent work.

**Never paste a client secret into a GitHub issue, a commit, or the app bundle.**
Secrets go into `~/.excerlock/env` and are mirrored to `/etc/excerlock/env` on
the VPS. The app only ever sees the `code` and hands it to the backend proxy.

## The one value every portal asks for

The API host is `api.excerlock.com` (Caddy on the Azure box, cert live). Routes
are registered under `/v1`, and the callback route is
`/vendors/:vendor/callback` — so the redirect URI per vendor is:

| Vendor | Redirect URI |
|---|---|
| Strava | *callback **domain** only:* `api.excerlock.com` |
| Oura | `https://api.excerlock.com/v1/vendors/oura/callback` |
| Whoop | `https://api.excerlock.com/v1/vendors/whoop/callback` |
| Polar | `https://api.excerlock.com/v1/vendors/polar/callback` |

Strava is the odd one out — it asks for an **Authorization Callback Domain**,
not a full URL. Enter the bare host with no scheme and no path.

---

## 1. Polar — do this one first (easiest, no review)

Portal: **https://admin.polaraccesslink.com**

1. Sign in with a Polar Flow account (create one at flow.polar.com if needed).
2. Create a new client: application + organization details.
3. OAuth2 redirect URL: `https://api.excerlock.com/v1/vendors/polar/callback`
4. Accept the AccessLink Limited License Agreement.
5. Client ID + secret are issued **immediately** — no review, no user cap.

Scope model is all-or-nothing (`accesslink.read_all`); nothing to choose.

## 2. Oura — self-serve, instant credentials

Portal: **https://cloud.ouraring.com/oauth/applications**
(A newer portal exists at `developer.ouraring.com`, but Oura's own docs still
route registration through the cloud portal.)

1. Sign in with an Oura account.
2. Create a new application.
3. Redirect URI — **exact match whitelist**, so it must be character-identical:
   `https://api.excerlock.com/v1/vendors/oura/callback`
4. Client ID + secret issued immediately.

**Cap: 10 users until approved.** The approval is an email process — file it as
soon as the app exists, well before TestFlight outgrows 10 Oura testers.

## 3. Whoop — self-serve, but has a review gate

Portal: **https://developer-dashboard.whoop.com** — verified 2026-08-01.
`developer.whoop.com` is the **documentation** site and has no app-creation UI;
the dashboard is a separate host.

1. Sign in with a WHOOP account.
2. Create an app. It requires **≥1 scope** and **≥1 redirect URL**.
3. Scopes to tick: `read:workout`, `read:cycles`, `read:recovery`, `offline`
   — plus `read:profile` only if we want a display name.
   **`offline` is mandatory**: without it Whoop issues no refresh token and
   every user silently drops off after the first token expiry.
4. Redirect URL: `https://api.excerlock.com/v1/vendors/whoop/callback`

**Cap: 10 members until approved.** Approval is a Typeform that wants design
screenshots, so it cannot be filed until the connect screens exist. Up to 5 apps
per developer account.

## 4. Strava — last, because it costs money

Portal: **https://www.strava.com/settings/api**

**A paid Strava subscription is required to create an API application** — this
is Strava's stated requirement, and the only hard cash line item in the four.

Note: hitting `/settings/api` while logged out bounces to `/login` and does
**not** return you afterwards. Re-open `/settings/api` manually once signed in.

1. Subscribe, then open the API settings page.
2. Fill in Application Name, Category, Club (optional), Website, Description.
3. **Authorization Callback Domain: `api.excerlock.com`** — domain only. Not a
   URL, no `https://`, no path. Strava rejects the full URL form.
4. Client ID + secret issued immediately.

Scope ExcerLock requests is `activity:read_all`, not `activity:read` — many
athletes default new activities to "Only You", and with the narrower scope those
workouts are invisible and the user's goal falsely fails.

**Rate limits start low and the app starts single-athlete.** The path is
single-athlete → 10-athlete → a review form to scale further. Polling-only caps
out around 50–100 DAU, so **apply for the rate-limit increase during the review
step**, not after launch.

---

## After you have the eight values

Tell the agent you're done and it will:

1. Write `STRAVA_CLIENT_ID/SECRET`, `OURA_…`, `WHOOP_…`, `POLAR_…` into
   `~/.excerlock/env` and mirror the secrets to `/etc/excerlock/env`.
2. Re-run `scripts/check-env.ts` — the vendor row is the last one still missing.
3. Wire and test the four OAuth flows against the live callbacks.

## Order and why

Polar and Oura take minutes and unblock real integration work immediately.
Whoop's review needs screenshots that don't exist yet, so registering early only
buys the 10-member sandbox. Strava is last because it is the only one that costs
money, and nothing else waits on it.
