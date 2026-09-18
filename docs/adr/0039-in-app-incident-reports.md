---
status: accepted
date: 2026-09-18
---

# 0039: In-app incident reports carry a bounded, denylisted diagnostic snapshot

## Decision

Problems are reported inside the app through one obvious Settings row ("Something not working?"): two free-text answers (what went wrong, what should have happened) and Send. The app posts those answers, its version/build and a diagnostic snapshot of what the runtime believed to a new authenticated endpoint, `POST /v1/incident-reports`, which persists every report in `incident_reports`. The mailto path is gone for problems; Feedback keeps its existing support form.

The snapshot is a pure projection (`app-next/src/runtime/incident/incidentDiagnostics.ts`) of state the runtime already holds: the last enforcement decision it acted on, walking and gym detection phases with their timestamps, permissions, rule shapes and recent per-day progress, entitlement and identity kind, recent verified walking segments, and a small persisted ring of lock/unlock transitions (`IncidentLog`) that yields last-locked and last-unlocked times. It is capped at 32 KB serialized and the server rejects any snapshot containing a key that names raw location, contact details, credentials or Screen Time app identity (`server/src/incidents/diagnostics.ts`), before anything is written.

## Context

`POST /v1/support` was category plus message, and the shipped app opened Mail with a reply-email field. Real reports arrived without the state needed to diagnose a wrong lock decision (walking phase, permissions, when the last unlock happened), and the Mail hop lost reports outright. The captain asked for a toddler-simple in-app report that ships "all the data the app saw, what the user experienced, and the desired outcome" to our server.

Alternatives considered: extending `/v1/support` with an optional diagnostics field (rejected: different retention, different reader, and a discriminated union that already strains the strict body); attaching a full linked-trace export (rejected: megabytes, contains raw motion streams, opt-in research tooling); reading `source.read()` at report time (rejected: its revision bump can supersede an apply still in flight, so reports read the snapshot the last reconcile acted on).

Privacy floor: no raw GPS, no place names or addresses, no email, no tokens, no Screen Time app names. Saved gyms appear only as a count and opaque place ids; the locked-app selection appears only as `{ isEmpty, hasSelection }`. The user id is taken from the bearer, never from the body or the snapshot.

## Consequences

Reports are readable with one SQL query (`server/src/incidents/README.md`) and a best-effort Resend email mirrors each one. The denylist is a safety net, not the design: new snapshot fields must stay within the floor above, and the app-side test asserts the shape carries none of the forbidden keys. Snapshot fields are additive; the server stores the JSON verbatim so older app builds keep reporting. Follow-up: a small operator view over `incident_reports` once volume warrants it.

## References

- `app-next/src/runtime/incident/` and `app-next/src/features/settings/ReportProblemScreen.tsx`
- `server/src/incidents/`, `server/src/routes/incidentReports.ts`, migration `server/drizzle/0010_incident-reports.sql`
- ADR 0011 and ADR 0018 (Supabase identity spine; the bearer user id is the report owner)
