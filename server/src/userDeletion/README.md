# User deletion

This module owns authenticated account erasure across the identity spine.
Routes depend on `UserDeletionService`; database and vendor details stay here.

## Deletion contract

1. A database transaction nulls profile data, deletes support content, feature
   votes, OAuth state, and encrypted vendor credentials, and anonymizes retained
   webhook bodies.
2. The canonical Supabase UUID remains only on a deletion tombstone. That pseudonymous key
   preserves webhook foreign keys and delivery idempotency for late renewal,
   refund, and vendor notifications.
3. Adapty profile erasure and PostHog person/event/recording erasure are
   checkpointed independently.
4. Supabase Auth is deleted last, after every processor confirms success. A
   durable bounded worker resumes incomplete tombstones without a client token;
   provider not-found is an idempotent success for lost-response recovery.

Support submissions are deliberately deleted even though they are the sole
copy. A deletion request is treated as withdrawal of consent to retain that
user-authored content; ExcerLock has no stated legal-hold requirement.

Account deletion does not cancel an App Store subscription. Apple owns that
relationship, and the app confirmation states this before invoking the route.

The workflow does not emit `account_deleted` to PostHog. Emitting an event with
the deleted distinct id after queuing erasure could recreate the person; emitting
beforehand can race PostHog's asynchronous ingestion because bulk deletion only
covers events captured before the request. The deletion API is the audit trail.

## Runtime configuration

Deletion fails closed until all of these are configured:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADAPTY_SECRET_KEY`
- `POSTHOG_PERSONAL_API_KEY` with `person:write`
- `POSTHOG_PROJECT_ID`
- optional `POSTHOG_API_HOST` (defaults to `https://us.posthog.com`)
- optional deletion worker interval, batch-size, and gateway timeout settings

No secret or identity is included in route error responses.

## Verification boundary

Automated coverage executes the deletion and late Adapty renewal/refund paths
against migrated PGlite and uses mocked processor HTTP responses. This lane did
not call the live Supabase, Adapty, or PostHog erasure endpoints, did not configure
or send a sandbox event from Adapty's dashboard, and did not exercise the full
flow on a physical device. `ADAPTY_WEBHOOK_SECRET`, the PostHog personal key,
and the PostHog project id are not currently present in `~/.excerlock/env`; they
must be provisioned on the VPS and verified before submission.

## Tests

```sh
npm run test:server -- user-deletion user-routes
```
