# Subscription metadata for the kept SKUs (review-readiness C6) — 2026-09-17

Read-write evidence for the C6 metadata lane, run against App Store Connect app `6787265352`
with the `asc` CLI. `asc-metadata-before.json` and `asc-metadata-after.json` are the raw
snapshots the guardrail read (`app-next/scripts/subscription-metadata.py --write-snapshot`);
`before-report.txt` and `after-report.txt` are its reports. Nothing here uploads an App Store
review screenshot or submits anything for review.

## State counts

| Snapshot | SKUs | READY_TO_SUBMIT | MISSING_METADATA |
|---|---|---|---|
| before | 51 | 2 | 49 |
| after | 51 | 2 | 49 |

**No SKU changed state.** Every one of the 49 is blocked by exactly one requirement: an App Store
review screenshot. That is why the counts did not move, and it is not a metadata gap.

## What was already there (correction to the C6 premise)

All 49 already carried, before this lane ran: an `en-US` localization on their subscription
version, a US price, availability, and the introductory offer matching their grid trial. The 45
grid SKUs' localizations were placeholders — every one of the 15 annuals was named `Annual`, all
21 monthlies `Monthly`, all 9 weeklies `Weekly`, with a period-only description — but they were
present. The four non-READY A/B SKUs (`a.winback.annual`, `b.annual`, `b.monthly`,
`b.winback.annual`) already carried the shipped copy and were still `MISSING_METADATA`.

## What changed

1. **45 grid display names** became unique and grid-derived: `<Period> $<price> (<trial>)`, e.g.
   `Monthly $17.99 (3-day trial)`. Before, 15 subscriptions in one group shared the name `Annual`.
   The descriptions kept the shipped renewal-terms sentence, which already named each period
   (`Unlock your apps by exercising. Renews monthly.`); App Store Connect rejects descriptions
   over 55 characters, so a trial clause cannot be appended to it, and the trial variant is
   carried by the display name (and re-checked against the introductory offer).
2. **Group level order** for the 6 weekly SKUs now matches the grid (weekly 1-9, monthly 10-30,
   annual 31-45, by price then trial). `weekly.699.t7` and `weekly.699.t3` held levels 1-2 while
   `weekly.599.*` held 3-5, so a level collision-free plan was applied (two SKUs parked above the
   grid first). No other SKU's level changed, and levels are contiguous 1-45.
3. **`ExcerLock Premium` group version localization** gained `customAppName = ExcerLock`, matching
   the Variant A and Variant B groups.

The two `READY_TO_SUBMIT` SKUs (`premium.a.annual`, `premium.a.monthly`) are byte-identical in the
before and after snapshots: no field of theirs was read back as changed. Prices, availability,
introductory offers and submissions were not touched. No subscription carries a review note, so
none was added (App Store Connect omits `reviewNote` when unset).

## Why READY_TO_SUBMIT needs the screenshot

Controlled comparison, not inference:

| SKU | Localization | Price + availability | Intro offer | Review screenshot | State |
|---|---|---|---|---|---|
| `premium.a.annual`, `premium.a.monthly` | yes | yes | yes | yes | READY_TO_SUBMIT |
| `premium.a.winback.annual`, `premium.b.*` | yes | yes | yes | **no** | MISSING_METADATA |
| 45 grid SKUs (after this lane) | yes | yes | yes | **no** | MISSING_METADATA |

`asc subscriptions list` therefore still reports 49 `MISSING_METADATA`, and the guardrail's
remaining findings are 49 `state` findings, each reported as `(App Store review screenshot
missing)`. Uploading the approved review image per subscription version (review-readiness A7,
`asc subscriptions versions images upload --version-id <VID> --file <review.png>`) is the only
step left before those 49 can leave `MISSING_METADATA`.

## Exact CLI errors seen while doing this

```
Error: subscriptions versions localizations update: failed to update: The provided entity includes an attribute with an invalid value: The field 'description' is too long. Max number of characters is 55.
Error: subscriptions versions localizations update: failed to update: The provided entity includes an attribute with an invalid value: The field 'name' is too long. Max number of characters is 35.
Error: unknown flag `--groupLevel` for `asc subscriptions update`   (the flag is --group-level)
Error: subscriptions review app-store-screenshot view: no App Store review screenshot found for subscription "6796884396": resource not found
Error: subscriptions review app-store-screenshot view: failed to fetch: retry limit exceeded after 4 retries: App Store Connect internal server error (status 500): An unexpected error occurred.
```

The last one was transient: `asc system-status --service "App Store Connect"` reported every
service operational, and a re-read of all 51 review-screenshot relationships returned the clean
"no App Store review screenshot found" answer for the 49 (and a screenshot for the two READY
ones). The collector now retries transient read failures and only treats that specific message as
"no screenshot", so a server error can never be reported as a missing asset.

## Reproducing

```sh
cd app-next
python3 scripts/subscription-metadata.py                      # audit, exits 1 on any gap
python3 scripts/subscription-metadata.py --report-only         # audit, always exits 0
python3 scripts/subscription-metadata.py --fill                # apply only missing/differing fields
python3 scripts/subscription-metadata.py --snapshot-file evidence/asc-subscription-metadata/asc-metadata-after.json
python3 scripts/test_subscription_metadata.py                  # offline contract tests (CI)
```

`--fill` is idempotent, skips every subscription that is already `READY_TO_SUBMIT`, refuses to
move a subscription between groups, and never changes prices or availability.
