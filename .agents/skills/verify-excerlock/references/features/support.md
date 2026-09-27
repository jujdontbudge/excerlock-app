---
id: support
title: Incident reports and feedback
routes: [settings/report, settings/feedback]
scenarios: [trial-active]
server: [POST /v1/incident-reports, POST /v1/support]
events: [incident_report_sent]
depends: [settings]
---
## Sub-features
- "Something not working?" asks two questions and sends them to `POST /v1/incident-reports`, together with the runtime's bounded diagnostic snapshot (ADR 0039). Location, app names and email are never included.
- Give feedback sends category `Idea` to `/v1/support`, which stores it and emails the owner through Resend.
- The Support row opens Mail.

## How to get to it (user POV)
Settings → Something not working?, or Give feedback.

## Driving it with excer
Run `./excer demo trial-active --open /settings/report`. A dev build uses the fake port, so it makes no network call.

```proof
name: report-form
scenario: trial-active
open: /settings/report
expect: Something not working? | What went wrong? | What should have happened? | Send report
```

```proof
name: feedback-form
scenario: trial-active
open: /settings/feedback
expect: Feedback | Reply email | Your feedback | Submit feedback | Email support instead
```

## Gotchas
- A failed send keeps both answers on screen.
- `/v1/support` succeeds even without a Resend key, because the email is sent after the data is stored.
