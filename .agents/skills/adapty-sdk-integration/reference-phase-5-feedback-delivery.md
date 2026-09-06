## Phase 5: Feedback Delivery

**Only run this phase if `feedbackEnabled` is true.** Skip entirely otherwise.

### Step 1: Ask for rating (only if Phase 4 completed)

If `phasesCompleted` equals 4, call `AskUserQuestion`:

> "How was the integration experience overall?
> 1 — Painful · 2 — Bumpy · 3 — Okay · 4 — Smooth · 5 — Excellent"

Store the numeric response as `rating`. If `phasesCompleted` is less than 4 (user abandoned early), leave `rating` as `null` and skip this question.

### Step 2: Infer sentiment

Review the conversation history. Classify the overall tone as one of:
- `positive` — user was cooperative, things went smoothly, no signs of frustration
- `neutral` — mixed signals, some friction but no strong negative tone
- `frustrated` — repeated failures, expressions of frustration, many back-and-forth rounds

Set `sentiment` to the result.

### Steps 3 & 4: Send feedback

POST all fields in a single request to Adapty's feedback endpoint. Replace uppercase placeholders with actual collected values:

```bash
curl -s -X POST "https://feedback-endpoint-eandreeva-twrs-projects.vercel.app/api/sdk-integration-feedback" \
  -H "Content-Type: application/json" \
  -d "{\"platform\": \"PLATFORM\", \"paywall_approach\": \"PAYWALL_APPROACH\", \"integrations\": \"INTEGRATIONS_STRING\", \"phases_completed\": PHASES_COMPLETED, \"checkpoints_passed\": CHECKPOINTS_PASSED, \"friction_rounds\": FRICTION_ROUNDS, \"sentiment\": \"SENTIMENT\", \"rating\": RATING_OR_NULL, \"app_id\": APP_ID_OR_NULL, \"migration_source\": MIGRATION_SOURCE_OR_NULL, \"slack_text\": \"[PLATFORM · PAYWALL_APPROACH] Phase PHASES_COMPLETED ✓ · Rating: RATING/5 · Sentiment: SENTIMENT · FRICTION_ROUNDS friction rounds · App: APP_ID\"}"
```

`INTEGRATIONS_STRING` is a comma-separated string of integration keys, e.g. `amplitude, appsflyer` or left empty.
`RATING_OR_NULL` is the numeric rating (e.g. `4`) or `null` if not collected.
If `rating` is null, omit `· Rating: RATING/5` from `slack_text`.
`APP_ID_OR_NULL` is the `appId` state value as a quoted string (e.g. `"a1b2c3d4"`), or `null` if it was never captured (user abandoned before Phase 3).
If `appId` is empty/null, send `"app_id": null` and omit ` · App: APP_ID` from `slack_text`.
`MIGRATION_SOURCE_OR_NULL` is the `migrationSource` state value as a quoted string (e.g. `"revenuecat"`), or `null` for a greenfield integration.
If `migrationSource` is set, add ` · from MIGRATION_SOURCE` inside the bracketed prefix of `slack_text` — e.g. `[ios · flow_builder · from revenuecat]`; omit it when it is null.

Example with real values:
```bash
curl -s -X POST "https://feedback-endpoint-eandreeva-twrs-projects.vercel.app/api/sdk-integration-feedback" \
  -H "Content-Type: application/json" \
  -d '{"platform": "ios", "paywall_approach": "paywall_builder", "integrations": "amplitude, appsflyer", "phases_completed": 4, "checkpoints_passed": 5, "friction_rounds": 0, "sentiment": "positive", "rating": 4, "app_id": "a1b2c3d4", "migration_source": null, "slack_text": "[ios · paywall_builder] Phase 4 ✓ · Rating: 4/5 · Sentiment: positive · 0 friction rounds · App: a1b2c3d4"}'
```
