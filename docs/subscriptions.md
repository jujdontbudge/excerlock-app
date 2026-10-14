# ExcerLock subscription catalog

App `6787265352`. The 45 grid products live in one subscription group, `ExcerLock Premium` (`22372981`).
One group means a user gets one free trial across every price, and can crossgrade between any two
plans with Apple prorating the difference. The live launch plans below sit in a separate group,
`ExcerLock Premium — Variant A` (`22279282`), so mixing a grid product with a launch plan on one
paywall would let a person hold two subscriptions at once.

Every product is available in all 175 territories and in new territories as Apple adds them.
Prices are equalized across territories from the US price.

## Launch plans

The paywall sells `com.johansardar.excerlock.premium.a.monthly` (`6796884508`) and
`com.johansardar.excerlock.premium.a.annual` (`6796884321`). The current live offers remain `ONE_WEEK` until the lead completes the rollout below. The target
is `THREE_DAYS`, `FREE_TRIAL`, one period, in all 175 territories, on both launch plans.
The app derives the displayed duration from Adapty/StoreKit and falls back to three days only
when metadata is unavailable. Existing trials keep their StoreKit expiry; the app reminds them
one day before that expiry. The independent `.t7` grid remains a seven-day catalog and must not
be changed by this launch-plan rollout.

## Switching price in seconds (live since 2026-10-14)

The onboarding and in-app paywalls now sell the 45-product grid, not the Variant A launch plans. A price or trial change is two Adapty calls and needs no build, OTA or App Review; clients pick it up on their next paywall load. Every grid product is approved, has the `premium` access level, and is in Adapty. Mix only grid products on one paywall (one subscription group, so Apple crossgrades instead of allowing two subscriptions).

| Placement | Paywall | Products |
|---|---|---|
| `onboarding` `29524927`, `onboarding_trial_fallback` `c063b816`, `in_app` `beb86e0e` | `c79aa881-9e63-4abd-acc4-369f0ad6048c` | `annual.3999.t3`, `monthly.999.t3`, `annual.3999.t0`, `monthly.999.t0` |
| `onboarding_no_trial` `1f9558eb` (install-split B) | `cf8d9e7a-7eaa-422f-9061-51db75283fe9` | `annual.3999.t0`, `monthly.999.t0` |
| `winback` `55351edf` | unchanged | Variant A win-back |

Rules the client relies on: list the yearly product first (it is the default selection). A trial paywall lists the `.t3` (or `.t7`) products, then their `.t0` twins at the same prices, so builds 17 and 18 on old JavaScript can still pair them. A no-trial paywall lists only `.t0` products. The app derives every price and trial length from StoreKit.

```sh
APP=9b8a6cf2-22c5-46f9-b938-35c27da2c66f
adapty products list --app $APP --page-size 100 --json   # Adapty product UUIDs by App Store product ID
adapty paywalls create --app $APP --title "Grid trial: annual 44.99 t3 ..." --product-id <annual t3> --product-id <monthly t3> --product-id <annual t0> --product-id <monthly t0> --json
adapty placements update --app $APP 29524927-9f2f-4dc0-a56a-ce59c6876c4b --developer-id onboarding --title "<current title>" --audiences '[{"segment_ids":[],"paywall_id":"<new paywall>","priority":0}]'
```

Repeat the placement update for `onboarding_trial_fallback` and `in_app` with the trial paywall, and for `onboarding_no_trial` with a matching `.t0`-only paywall. Changing a live placement is a third-party dashboard change and needs the owner's go-ahead. Roll back by pointing the placements at the previous paywall ID (A `cf28c3cc-52c2-4bd0-b467-81d68c84bb8c`, B `a2d11553-f39b-4ac2-8444-5e51a58e0790`).

Clients before the 2026-10-14 OTA recognise B only by the Variant A `.notrial` twins, so a grid B paywall sends them to the trial fallback paywall until that OTA is installed.

## Three-day trial versus no-trial experiment

[ADR 0078](adr/0078-adapty-onboarding-trial-assignment.md) owns the client behavior. Nothing in
this document authorizes a dashboard, product or release change by a worker.

The operator must configure the following in Adapty app `9b8a6cf2-22c5-46f9-b938-35c27da2c66f`,
on access level `premium`, subscription group `ExcerLock Premium — Variant A` (`22279282`).
Do not use the separate 45-grid group.

| Paywall | Products, in this order | Remote config in every locale |
|---|---|---|
| A | `com.johansardar.excerlock.premium.a.annual`, `com.johansardar.excerlock.premium.a.monthly`, `com.johansardar.excerlock.premium.a.annual.notrial`, `com.johansardar.excerlock.premium.a.monthly.notrial` | `{"trial":true,"recommendedProductId":"com.johansardar.excerlock.premium.a.annual"}` |
| B | `com.johansardar.excerlock.premium.a.annual.notrial`, `com.johansardar.excerlock.premium.a.monthly.notrial` | `{"trial":false,"recommendedProductId":"com.johansardar.excerlock.premium.a.annual.notrial"}` |

Keep the existing neutral `title`/`body` remote config, or use `Choose your plan` and
`Build a healthier relationship with your phone.` No trial copy on B. `trial` must be a JSON
boolean, never the strings `"true"` or `"false"`. A includes its twins to keep the existing
Enable free trial toggle; B contains exactly the two approved twins and no intro offer.
The product order is annual then monthly on both arms. These products have the same prices
and group; only A's base products have introductory offers.

Placements ([ADR 0079](adr/0079-install-split-onboarding-trial-assignment.md)):

- `onboarding` `29524927` → A. Clients hashed to A load it.
- `onboarding_no_trial` `1f9558eb` → B `a2d11553` (the two twins, no remote config needed).
  Clients hashed to B load it. Repoint it to A to stop B everywhere without an OTA.
- `onboarding_trial_fallback` `c063b816` → A, 100%, no A/B test, no B.
- Keep `in_app` and `winback` outside this experiment.

Agent operation, Adapty app `9b8a6cf2-22c5-46f9-b938-35c27da2c66f`:

```sh
APP=9b8a6cf2-22c5-46f9-b938-35c27da2c66f
adapty placements get --app $APP 1f9558eb-51ed-4fff-a737-1f357acf71dd
adapty placements update --app $APP 1f9558eb-51ed-4fff-a737-1f357acf71dd --developer-id onboarding_no_trial --title "Onboarding no trial (B)" --audiences '[{"segment_ids":[],"paywall_id":"cf28c3cc-52c2-4bd0-b467-81d68c84bb8c","priority":0}]'
adapty placements update --app $APP 1f9558eb-51ed-4fff-a737-1f357acf71dd --developer-id onboarding_no_trial --title "Onboarding no trial (B)" --audiences '[{"segment_ids":[],"paywall_id":"a2d11553-f39b-4ac2-8444-5e51a58e0790","priority":0}]'
```

The first update stops B (B installs see A, with `assigned_arm: b`); the second resumes B.
Changing the production placement is a third-party dashboard change and needs the owner's
go-ahead. Read results in PostHog from `onboarding_offer_exposed` by `assigned_arm`
(intention to treat) and `arm` (as shown), then Adapty for revenue.

Release and operator order:

1. Read-only confirm the base launch plans and both `.notrial` twins are approved, purchasable
   in all required territories and in group `22279282`; confirm the twins have no intro offer.
2. Duplicate/create A and B with the exact products/config above. Create the custom-attribute
   audience and the control-only fallback placement. Keep the experiment disabled and the
   live `onboarding` default on A. Prepare the 50/50 test without activating it.
3. Integrate the JavaScript change into release `main` with authorization. Run the OTA ship
   gate and publish separately to runtime 4/build 17 and runtime 5/build 18 under the release
   lock: `./excer ota --runtime 5` and `./excer ota --runtime 4`, each with the ship proofs on an
   installed build of that runtime (`docs/ota.md`). Done for `b4906c47` on 2026-10-13. Verify each installed OTA still reads the current seven-day metadata
   correctly, and the marker is present before enabling its experiment audience. No native
   module, dependency, StoreKit environment selection, build or runtime-version change is needed.
4. Only after both OTA publications succeed, replace the launch plans' current intro offers
   in App Store Connect: monthly `6796884508`, annual `6796884321`, `THREE_DAYS`, `FREE_TRIAL`,
   `numberOfPeriods = 1`, all 175 territories and future territories. End/remove the old
   `ONE_WEEK` offers as ASC requires; do not leave overlapping effective offers. Verify the
   effective duration, mode, dates and territory coverage on both products. Do not alter
   renewal prices, subscription groups, twins or any `.t7` grid product. This changes future
   eligible trials, not an already-started trial's expiry.
5. Wait for StoreKit/Adapty catalog propagation. On updated clients verify both monthly and
   annual show the actual three-day offer, Day 2 reminder/Day 3 billing, toggle on A, plain
   billing for intro-ineligible accounts, and the control-only fallback. Verify a real Sandbox
   purchase and reminder separately; simulator scripted SDK evidence is not a receipt.
6. The install split is live once the OTA carrying ADR 0079 is published. Verify a
   known B assignment skips only `S3c` and `S3d`, keeps `S3e`, has no toggle/trial wording and
   purchases the selected `.notrial` twin. Verify A still selects the base product by default.
   Confirm `logShowFlow` reports the retained variation, not a second assignment.

PostHog receives the ordinary UI exposure `onboarding_offer_exposed` with `arm` (`a`/`b`), `assigned_arm` (`a`/`b`),
`source` (`adapty`/`fallback`), `intro_offer` (`available`/`unavailable`/`unknown`) and optional
`variation_id`, plus `offer_arm`/`offer_source` on `paywall_viewed`, only under the existing
opt-in and ready canonical identity rules. It receives no new feature-flag exposure; this
experiment does not use a PostHog flag. Purchase/restore/trial/subscription lifecycle prefixes
are blocked at the PostHog boundary. Adapty owns purchase conversion and revenue measurement.
Fallback users must be analyzed separately; the effective split can differ from 50/50 during
outages or late loads. A known intro-ineligible user remains A but skips unavailable trial
promises and sees ordinary billing.

| Product ID | Period | US price | Free trial | ASC ID |
|---|---|---|---|---|
| `com.johansardar.excerlock.premium.weekly.599.t0` | weekly | $5.99 | none | 6810461585 |
| `com.johansardar.excerlock.premium.weekly.599.t3` | weekly | $5.99 | 3 days | 6810461728 |
| `com.johansardar.excerlock.premium.weekly.599.t7` | weekly | $5.99 | 7 days | 6810460971 |
| `com.johansardar.excerlock.premium.weekly.699.t0` | weekly | $6.99 | none | 6810461729 |
| `com.johansardar.excerlock.premium.weekly.699.t3` | weekly | $6.99 | 3 days | 6810461357 |
| `com.johansardar.excerlock.premium.weekly.699.t7` | weekly | $6.99 | 7 days | 6810460963 |
| `com.johansardar.excerlock.premium.weekly.999.t0` | weekly | $9.99 | none | 6810462259 |
| `com.johansardar.excerlock.premium.weekly.999.t3` | weekly | $9.99 | 3 days | 6810462095 |
| `com.johansardar.excerlock.premium.weekly.999.t7` | weekly | $9.99 | 7 days | 6810462349 |
| `com.johansardar.excerlock.premium.monthly.799.t0` | monthly | $7.99 | none | 6810462569 |
| `com.johansardar.excerlock.premium.monthly.799.t3` | monthly | $7.99 | 3 days | 6810462571 |
| `com.johansardar.excerlock.premium.monthly.799.t7` | monthly | $7.99 | 7 days | 6810462578 |
| `com.johansardar.excerlock.premium.monthly.999.t0` | monthly | $9.99 | none | 6810462659 |
| `com.johansardar.excerlock.premium.monthly.999.t3` | monthly | $9.99 | 3 days | 6810462561 |
| `com.johansardar.excerlock.premium.monthly.999.t7` | monthly | $9.99 | 7 days | 6810462644 |
| `com.johansardar.excerlock.premium.monthly.1099.t0` | monthly | $10.99 | none | 6810462748 |
| `com.johansardar.excerlock.premium.monthly.1099.t3` | monthly | $10.99 | 3 days | 6810462751 |
| `com.johansardar.excerlock.premium.monthly.1099.t7` | monthly | $10.99 | 7 days | 6810462774 |
| `com.johansardar.excerlock.premium.monthly.1299.t0` | monthly | $12.99 | none | 6810462592 |
| `com.johansardar.excerlock.premium.monthly.1299.t3` | monthly | $12.99 | 3 days | 6810462782 |
| `com.johansardar.excerlock.premium.monthly.1299.t7` | monthly | $12.99 | 7 days | 6810462530 |
| `com.johansardar.excerlock.premium.monthly.1499.t0` | monthly | $14.99 | none | 6810462867 |
| `com.johansardar.excerlock.premium.monthly.1499.t3` | monthly | $14.99 | 3 days | 6810462923 |
| `com.johansardar.excerlock.premium.monthly.1499.t7` | monthly | $14.99 | 7 days | 6810462983 |
| `com.johansardar.excerlock.premium.monthly.1799.t0` | monthly | $17.99 | none | 6810462930 |
| `com.johansardar.excerlock.premium.monthly.1799.t3` | monthly | $17.99 | 3 days | 6810463022 |
| `com.johansardar.excerlock.premium.monthly.1799.t7` | monthly | $17.99 | 7 days | 6810463094 |
| `com.johansardar.excerlock.premium.monthly.1999.t0` | monthly | $19.99 | none | 6810463027 |
| `com.johansardar.excerlock.premium.monthly.1999.t3` | monthly | $19.99 | 3 days | 6810463058 |
| `com.johansardar.excerlock.premium.monthly.1999.t7` | monthly | $19.99 | 7 days | 6810463159 |
| `com.johansardar.excerlock.premium.annual.2999.t0` | annual | $29.99 | none | 6810463121 |
| `com.johansardar.excerlock.premium.annual.2999.t3` | annual | $29.99 | 3 days | 6810463213 |
| `com.johansardar.excerlock.premium.annual.2999.t7` | annual | $29.99 | 7 days | 6810463439 |
| `com.johansardar.excerlock.premium.annual.3499.t0` | annual | $34.99 | none | 6810463367 |
| `com.johansardar.excerlock.premium.annual.3499.t3` | annual | $34.99 | 3 days | 6810463540 |
| `com.johansardar.excerlock.premium.annual.3499.t7` | annual | $34.99 | 7 days | 6810463652 |
| `com.johansardar.excerlock.premium.annual.3999.t0` | annual | $39.99 | none | 6810463566 |
| `com.johansardar.excerlock.premium.annual.3999.t3` | annual | $39.99 | 3 days | 6810463454 |
| `com.johansardar.excerlock.premium.annual.3999.t7` | annual | $39.99 | 7 days | 6810463830 |
| `com.johansardar.excerlock.premium.annual.4499.t0` | annual | $44.99 | none | 6810463892 |
| `com.johansardar.excerlock.premium.annual.4499.t3` | annual | $44.99 | 3 days | 6810463898 |
| `com.johansardar.excerlock.premium.annual.4499.t7` | annual | $44.99 | 7 days | 6810463904 |
| `com.johansardar.excerlock.premium.annual.4999.t0` | annual | $49.99 | none | 6810463718 |
| `com.johansardar.excerlock.premium.annual.4999.t3` | annual | $49.99 | 3 days | 6810463930 |
| `com.johansardar.excerlock.premium.annual.4999.t7` | annual | $49.99 | 7 days | 6810463997 |

## Adapty + local StoreKit mirror

Adapty app `9b8a6cf2-22c5-46f9-b938-35c27da2c66f` mirrors all 51 products (the six A/B
contracts plus this 45-grid) on access level `premium` (`b95ba4b6-812e-4ce4-b2ac-8416006bc40a`),
so any grid price/trial SKU can be attached to a paywall and served without an app change.
The Debug-only local harness catalog (`app-next/storekit/ExcerLock.storekit`) mirrors the grid
in a `Premium Grid` group. Add a future SKU to Adapty with:

```
adapty products create --app 9b8a6cf2-22c5-46f9-b938-35c27da2c66f \
  --access-level-id b95ba4b6-812e-4ce4-b2ac-8416006bc40a \
  --period <annual|monthly|weekly> --title "<human title>" --ios-product-id <PRODUCT_ID>
```

Guardrail (from `app-next/`): `npm run catalog:drift` compares `asc subscriptions list`,
`adapty products list` and the storekit catalog and exits non-zero on drift;
`npm run catalog:drift:report` prints the same report and always exits 0 for scheduled CI runs.
`npm run catalog:metadata` checks per-SKU App Store metadata against this grid (localization
display name and description, group, group order, introductory offer, `READY_TO_SUBMIT`) and
fails while any SKU is `MISSING_METADATA`; `npm run catalog:metadata:fill` applies only the
missing or differing fields.

## Review status

Until October 1, 2026 the 45 grid products and the four A/B products below were stuck in
`MISSING_METADATA` because none had an App Store review screenshot. That day each got a
screenshot of the live paywall, a review note and worldwide availability, and all 49 went to
review in submission `30483355-0df4-4a5d-ade7-2af17f74a393` with both group versions:
`premium.a.winback.annual`, `premium.b.annual`, `premium.b.monthly` and
`premium.b.winback.annual`. The no-trial twins `premium.a.annual.notrial` and
`premium.a.monthly.notrial` went in the earlier submission `2c9e8064`. Grid free trials (3 days on
`.t3`, one week on `.t7`) were extended from the US to all 175 territories with
`asc subscriptions offers introductory create --all-territories`; that needs no review.

Project-local check (from `app-next/`):

```
python3 scripts/subscription-metadata.py            # fails while a SKU is not ready or in review
python3 scripts/subscription-metadata.py --fill     # idempotent; never touches ready or in-review SKUs
```

Copy, its derivation and the exact errors seen while filling it are recorded in
`app-next/evidence/asc-subscription-metadata/README.md`.

## Changing price or trial without an app update

Once Apple approves a product, the app sells it as soon as an Adapty paywall carrying it is
served; no OTA or build is needed. Adapty locks the products of a live paywall, so a price or
trial change is a new paywall, not an edit:

1. Duplicate the live paywall in the Adapty dashboard and swap in the approved products for the
   new price and trial. Duplicating keeps the remote config (`title`, `body`,
   `recommendedProductId`); set `recommendedProductId` to the new plan.
   `adapty paywalls create` takes Adapty product UUIDs but cannot set remote config.
2. Point the placements at it with `adapty placements update <PLACEMENT_ID> --app <APP>
   --developer-id <onboarding|in_app|winback> --title <TITLE>
   --audiences '[{"segment_ids":[],"paywall_id":"<PAYWALL_ID>","priority":0}]'`. Devices pick up
   the new paywall on their next fetch.

To test prices against each other, run an Adapty A/B test on the placement instead of
repointing it. Serve products from one subscription group per paywall: grid products sit in
`ExcerLock Premium`, while existing subscribers hold Variant A plans, so offering them a grid plan
could leave them paying for two subscriptions.

## Taking a price off sale

Removing a product from sale is a web-session flow:

```
asc web subscriptions availability remove-from-sale --subscription-id <ASC_ID>
```

Anyone already subscribed to a product taken off sale keeps it and continues renewing.

The numeric audience marker is persistent profile metadata, not a per-request capability attestation. Disable B before rolling back this JavaScript, and consider a marker-bearing account reopened by an older client when validating rollout audiences. The marker limits ordinary pre-OTA rollout exposure; it is not an authorization or cross-device version guarantee.

## Complimentary Premium

Server-owned grants by confirmed account email are independent of purchases and partitioned by authorization environment (ADR 0077). Agents use `./excer access grant|revoke|list`; see [the workflow](agents/access.md). Adapty still owns paid subscriptions, products, trials, restore and pricing.
