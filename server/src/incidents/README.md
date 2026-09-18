# Incident reports

## Contract

`POST /v1/incident-reports` persists one in-app incident report per call: the
user's two answers (what went wrong, what should have happened), the app
version/build, and the diagnostic snapshot the app held when the user pressed
Send. The verified bearer user id is the owner; the body never names a user.

## Invariants

- The diagnostics document is bounded by the route (32 KB serialized) and
  content-guarded by `findForbiddenDiagnosticKey`: any key naming raw location,
  contact details, credentials or Screen Time app identity rejects the whole
  report with `400 DIAGNOSTICS_REJECTED` before persistence.
- Persist first; the Resend notification is best effort and never fails the
  request (same `SUPPORT_NOTIFY_EMAIL` / `RESEND_API_KEY` as support).
- No earning, minutes, ledger, shield or locking state is derived here; the
  snapshot is stored verbatim for humans to read later.

## Reading reports

```sql
select created_at, app_version, app_build, what_went_wrong, should_have_happened, diagnostics
from incident_reports order by created_at desc limit 20;
```

## Tests

```sh
npm run test:server -- incident
```
