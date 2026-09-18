# fakes

Owns src/demo/fakes for the local Phase 1 app. Product behavior follows plans/rebuild; reference-app and real-service implementations remain outside this module.

SupportFake simulates submit latency and success/error/cancel, then returns `{ via: 'server' }`. IncidentReportFake does the same for the in-app incident report and returns a fake `reportId`. AuthFake deletion preserves all local stores and only returns the session to anonymous.
