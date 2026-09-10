Live retry — read-only, no mutations, no repo edits, no secrets printed. Network now works (prior `ENOTFOUND` sandbox failure gone).

### 1. AASA — LIVE FAIL (missing on server)
- `curl ... https://excerlock.com/.well-known/apple-app-site-association`
- Result: `HTTP 404 size=0`, `content-length: 0`, `server: Caddy`, body 0 bytes
- Alt path `https://excerlock.com/apple-app-site-association`: `HTTP 404 size=0`
- Verdict: no AASA file served; `applinks` app-ID `AX3C2B78YD.com.johansardar.excerlock` **cannot match**. T00 step 8 still open.

### 2. EAS auth — LIVE PASS
- `eas whoami` → `johansardar`, Owner of `johansardar` + `johansardars-team`. Auth + network OK.

### 3. EAS plan tier / code-signing — STILL GAP (not auth, not sandbox)
- `eas account:view` → same identity output only, no plan tier.
- `eas project:info` (in `app/`) → exact sanitized error:
  > `Unable to resolve a valid config plugin for ./plugins/withNoPush ... Cannot find module 'expo/config-plugins' ... Error: project:info command failed.`
  Local `node_modules`/plugin resolution failure, not server auth.
- `eas project:info --projectId 9a358379-...` (from root) → exact error:
  > `EAS project not configured... eas init --id <project-id> --non-interactive ... Error: project:info command failed.`
- Verdict: plan tier + signing entitlement **unverified via CLI**. Needs dashboard billing page or fixed local install. No `codeSigning` in local manifests per prior report (unchanged, not re-read).

### 4. Supabase Auth providers — LIVE PASS (booleans only)
- Unauthed `GET https://hqgqhefftjxwdhqeushr.supabase.co/auth/v1/settings` → `HTTP 401 Unauthorized` (proves DNS/network OK, auth required — not sandbox failure).
- Authed with `SUPABASE_URL` + `SUPABASE_ANON_KEY` from `~/.excerlock/env` (values never printed), `ref_present=True url_host_match=True anon_present=True`:
  - `external.apple=True, google=True, email=True, anonymous_users=True`
  - `azure/github/facebook/etc=False`, `phone=False`
  - `disable_signup=False` (signup enabled), `mailer_autoconfirm=True`, `phone_autoconfirm=False`
- Verdict: Apple / Google / Email / Anonymous **enabled flags true** at Auth-settings level.

### 5. Supabase native Apple registration detail — STILL GAP (missing auth, not sandbox)
- Settings endpoint returns only boolean `external.apple=True`, no Team ID / bundle / Services ID / Google client linkage.
- That detail needs Management API (`SUPABASE_ACCESS_TOKEN`) or dashboard Auth › Sign in with Apple. Prior report: no `SUPABASE_ACCESS_TOKEN` name in `~/.excerlock/env`. No CLI read attempted beyond above to stay in scope/key-minimal.
- Verdict: enabled ≠ native iOS registration confirmed. Dashboard check still required for Team `AX3C2B78YD`, bundle `com.johansardar.excerlock`, Services ID, Google client linkage, Email OTP + Anonymous toggles.

**Bottom line:** Live: AASA 404 missing; EAS authenticated as `johansardar`; Supabase providers enabled (Apple/Google/Email/Anonymous true). Gaps: EAS plan/signing tier (local CLI blockers, use dashboard); Supabase native-Apple/native-Google config detail (needs dashboard or access token); AASA file + client `associatedDomains` still pending.
