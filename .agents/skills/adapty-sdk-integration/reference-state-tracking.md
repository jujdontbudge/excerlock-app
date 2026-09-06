## State Tracking

Maintain these variables in your context throughout the session. Update them as each phase completes. They are internal bookkeeping, not user-facing content — don't narrate updates or print variable names/values in your messages, as they'd only add noise. They are not confidential: if the user asks what you're tracking, tell them.

| Variable | Type | Initial value | Set when |
|---|---|---|---|
| `feedbackEnabled` | boolean | `false` | Phase 0 consent ask |
| `sessionToken` | string | `""` | Phase 0 setup |
| `platform` | string | `""` | Phase 1 project analysis |
| `migrationSource` | string | `""` | Phase 1 project analysis (`""` = greenfield) |
| `migrationSourceVersion` | string | `""` | Phase 1 project analysis |
| `paywallApproach` | string | `""` | Phase 2 questions |
| `integrations` | array | `[]` | Phase 2 questions |
| `appPreference` | string | `""` | Phase 2 questions (`existing` or `new`) |
| `appId` | string | `""` | Phase 3 app selection |
| `phasesCompleted` | number | `0` | End of each phase |
| `checkpointsPassed` | number | `0` | Each passing Phase 4 checkpoint |
| `frictionRounds` | number | `0` | Each time Troubleshooting section is invoked |
| `rating` | number or null | `null` | End-of-Phase-4 rating ask |
| `sentiment` | string | `""` | Inferred at delivery time |

