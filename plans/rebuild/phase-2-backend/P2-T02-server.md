# P2-T02 — VPS server: Supabase JWTs, schema, sync endpoints, Clerk and vendor removal

## Facts (from the inventory)

- Fastify 5 + Drizzle + Postgres 16 on the Azure VM, deployed by `deploy/deploy.sh` (rsync + systemd + Caddy).
  `server/src/auth.ts` (~90 lines) is the whole Clerk surface; every route reads the user id via one accessor.
- `users.id` is `text` and doubles as Adapty `customer_user_id` and PostHog `distinct_id`.
- Vendor stack (routes, `vendors/`, three tables) is dead by decision D6.
- No crons exist. The Adapty webhook mirrors `has_access`/`expires_at` idempotently.

## Steps

1. **Auth**: rewrite `server/src/auth.ts` to verify Supabase access tokens. Check the current Supabase JWT
   signing scheme in the docs (asymmetric JWKS at `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`
   with ES256/RS256, or the legacy HS256 shared secret) and support the one the project uses; identity =
   `{ userId: payload.sub, isAnonymous: payload.is_anonymous === true }`. Rename `clerkIdentity` →
   `authIdentity`, `clerk_deleted_at` → `auth_deleted_at` (migration). Env: `SUPABASE_URL`,
   `SUPABASE_JWT_JWKS_URL` or `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` (deletion only). Remove
   `CLERK_SECRET_KEY` from `env.ts`, `deploy/cloud-init.yaml`, and the README.
2. **Deletion**: `userDeletion/httpGateway.ts` deletes the Supabase user via the Admin API with the service
   role key, **last** in the ordering (Adapty → PostHog → Supabase). Tests updated.
3. **Schema** (Drizzle migration 0006+): drop `vendor_connections`, `vendor_oauth_states`,
   `vendor_webhook_events`; drop `feature_requests`, `feature_request_votes` (B17; keep `support_requests`);
   add:
   - `rules` (`id` uuid PK, `user_id` → users, `activity`, `mode` jsonb, `schedule` jsonb, `enabled`,
     `created_at`, `updated_at`, `deleted_at`), index (user_id, updated_at).
   - `rule_days` (`user_id`, `rule_id`, `day` date, `progress` numeric, `met` bool, `met_at`, `updated_at`;
     PK (user_id, rule_id, day)).
   - `usage_days` (`user_id`, `day` date, `locked_app_minutes` int, `updated_at`; PK (user_id, day)).
   - `profiles` (`user_id` PK, `name`, `referral_source`, `age_band`, `occupation`, `improve_first`,
     `main_reason`, `estimated_daily_minutes`, `units`, `updated_at`).
   Privacy law carried over: no app names, no bundle ids, no location coordinates, no health samples;
   `rule_days.progress` is an aggregate number in the rule's own unit. Gym place names and coordinates stay
   on the device (they never leave; `GymPort` stores locally).
4. **Endpoints** (all under `/v1`, auth required unless noted):
   - keep `GET /health`, `GET /ready` (readiness table list updated), `POST /webhooks/adapty` (unchanged),
     `PUT /user`, `DELETE /user`, `POST /support`.
   - implement `GET /user` → `{ id, isAnonymous, createdAt }` (was 501).
   - add `PUT /sync/rules` (full replacement of the user's rule set with `updated_at` last-write-wins per
     rule), `PUT /sync/rule-days` (upsert batch, max 400), `PUT /sync/usage-days` (upsert batch),
     `PUT /sync/profile`, `GET /sync` → everything for the user (rules, last 400 rule_days, last 400 usage_days,
     profile) for restore on a new device.
   - delete all vendor routes and `routes/vendorWebhooks.ts`.
5. **Server analytics**: `services/analytics.ts` unchanged; `support_request_submitted` and `account_deleted`
   stay server-owned. `data_export_requested` and `diagnostics_shared` remain defined but unemitted unless the
   feature exists.
6. Tests with pglite: auth (valid, expired, wrong issuer, anonymous), every endpoint, migration up on a
   0005 database, deletion ordering, sync last-write-wins, batch limits, RLS-equivalent ownership checks
   (a user can never read or write another user's rows).
7. Deploy: `deploy/deploy.sh` unchanged in mechanism; `/etc/excerlock/env` gets the new vars (Johan applies
   on the box). Run `/v1/ready` after deploy.

## Acceptance

- [ ] `npm test --workspace server` green; `npm run typecheck` green; migration applies to a copy of prod
      schema.
- [ ] Deployed to the VPS; `curl https://api.excerlock.com/v1/ready` → 200; a Supabase dev token hits
      `GET /v1/user` → 200; a Clerk-style token → 401.
- [ ] Vendor code, tables and docs references gone (`grep -ri strava server/src` empty).
