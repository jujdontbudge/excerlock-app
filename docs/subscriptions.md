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
`com.johansardar.excerlock.premium.a.annual` (`6796884321`). Both carry a one-week free-trial
introductory offer (`ONE_WEEK`, `FREE_TRIAL`, one period) in all 175 territories. Annual has had it
since launch. Monthly got it on September 23, 2026, on Johan's call, so the onboarding paywall can
show the trial badge on both plans and keep "No payment due now" whichever plan is picked. It was
created with `asc subscriptions offers introductory create --subscription-id 6796884508
--all-territories --offer-duration ONE_WEEK --offer-mode FREE_TRIAL --number-of-periods 1`, with
175/175 created, while both products were `WAITING_FOR_REVIEW` in the build 10 submission. The
local StoreKit harness catalog and the demo fake match.

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
