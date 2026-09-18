# incident

The in-app "Something not working?" report. `createIncidentReportPort` turns the person's two answers plus
`buildIncidentDiagnostics` (a pure projection of what the runtime believed: lock decision, walking/gym phase,
permissions, rules, recent lock/unlock transitions, recent verified walking) into one `POST /v1/incident-reports`
through `IncidentReportTransport` (bearer from `getAuthContext`; never reads a token itself).

`IncidentLog` is the runtime's small persisted ring of enforcement transitions; the real runtime records one entry
per apply whose decision changed, so a report can say when the last lock and unlock happened.

Never put in a snapshot: coordinates, place names, addresses, emails, tokens, Screen Time app names. The server
rejects such keys outright (`server/src/incidents/diagnostics.ts`).
