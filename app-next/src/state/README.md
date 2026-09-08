# state

Persistent application state and selectors. No UI styling.

`enforcementStore` is the exception: it is deliberately not persisted. It owns the ephemeral enforcement
facts the runtime host publishes — `enforcementStatus` (the last `ApplyResult`, which Home renders as
"Blocking is not on"), `lastClaimAt` (the claim-on-open timestamp) and the retry token Home's Try again
action bumps. Nothing here survives a launch; the host republishes on its first apply.

`reviewStore` is the rating policy's memory (install date, prompts shown, manual Rate tap); `adapters/review` is its only writer.

`settingsStore.shareAnalytics` is the "Share usage analytics" answer (D9b). It defaults to on, which is
why the analytics adapter reads it only once the store has hydrated: answering the default before
rehydration would send the first events of a session belonging to someone who had already opted out.

`todayHistory` replaces today’s fixture completion with actual enabled schedules and RuleDays before streak/analytics selectors read it. Historical usage remains measurement data; missing usage is not fabricated.

## Persisted-store contract

Every persisted store is declared through `defineStore({ name, initial, schemaVersion, migrations, validators })`.
The storage key stays stable while `schemaVersion` increases. Each migration is keyed by the schema version it
reads, receives the persisted `data` object, and returns the next version. A version bump must include every
forward step; schema changes must not be hidden in validators or hydration call sites.

Use field validators for scalar and object fields. Use `v.arrayOf(validateRow)` for persisted arrays. It keeps
valid rows, puts malformed rows in the store's non-persisted `rejected` slot for developer diagnostics, and
reports the dropped count through `hydrationReport`. Use `v.optional(check)` when a newly introduced field can
be absent from older rows.

AsyncStorage write failures become typed `PersistError` entries in `hydrationReport`. Home renders the report
as one dismissible notice; rejected rows and error details never become part of persisted product data.
