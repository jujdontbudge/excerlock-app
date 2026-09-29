# Hard-Paywall local proof inventory

Inventory date: September 29, 2026. This inventory distinguishes local simulator/stub evidence from StoreKit, provider, TestFlight, native Screen Time, and owner acceptance. A local pass is never ownership proof.

Status vocabulary:

- `PASS_LOCAL`: the planned invariant has passing local evidence through the shipping Journey/adapters or a named diagnostic.
- `PASS_LOCAL_DEVICE_GAP`: the local invariant passes, but the case also requires physical-device or vendor evidence.
- `BLOCKED_DECISION`: the product policy is intentionally unresolved.
- `BLOCKED_EXTERNAL`: the remaining assertion cannot be established by simulator fixtures or stub vendors.

## App cases (56)

| ID | Status | Passing evidence or exact gap |
| --- | --- | --- |
| J01 | PASS_LOCAL | `launch/first-launch-welcome`: `.excer/proof/launch/2026-09-29_17-17-55/` |
| J02 | PASS_LOCAL | `launch/subscriber-starts-welcome`: `.excer/proof/launch/2026-09-29_17-18-11/` |
| J03 | PASS_LOCAL | `launch/unpaid-starts-welcome`: `.excer/proof/launch/2026-09-29_17-18-27/` |
| J04 | PASS_LOCAL_DEVICE_GAP | Reinstall/keychain fixture: `.excer/proof/launch/2026-09-29_18-14-17/`; physical uninstall/reinstall remains required. |
| J05 | BLOCKED_DECISION | ADR 0050 deliberately leaves ordinary admitted cold-reopen policy unresolved. Choosing Welcome versus renewed admission is an owner product decision. |
| J06 | BLOCKED_EXTERNAL | Foreground continuity during real Apple/Google/email and StoreKit sheets requires provider/device automation. Local operation journals are covered by P05/P08, but no simulator fixture is represented as a real sheet-resume pass. |
| J07 | PASS_LOCAL_DEVICE_GAP | Cached active Entitlement cannot skip entry: `.excer/proof/launch/2026-09-29_18-18-29/`; full shipped path diagnostic: `.excer/proof/dev-harness/2026-09-29_18-30-08/`; individual Onboarding screen proofs remain in the feature manifest. Physical traversal remains required. |
| J08 | PASS_LOCAL | Staging before admission: `.excer/proof/onboarding/2026-09-29_06-00-45/`; one admitted commit through checkout: `.excer/proof/paywall/2026-09-29_16-07-06/`. |
| A01 | PASS_LOCAL_DEVICE_GAP | Paid account admission: `.excer/proof/launch/2026-09-29_17-19-03/`. Real Apple/Google/email variants remain device/provider acceptance. |
| A02 | PASS_LOCAL_DEVICE_GAP | Unpaid account to hard Paywall: `.excer/proof/launch/2026-09-29_17-18-44/`; provider attempts: `.excer/proof/account/2026-09-29_15-10-00/`; email: `.excer/proof/account/2026-09-29_15-35-08/`. |
| A03 | PASS_LOCAL_DEVICE_GAP | Expired account: `.excer/proof/launch/2026-09-29_18-20-10/`. |
| A04 | PASS_LOCAL | Unavailable proof: `.excer/proof/launch/2026-09-29_08-35-47/`; slow/error retry: `.excer/proof/paywall/2026-09-29_17-08-45/`. |
| A05 | PASS_LOCAL_DEVICE_GAP | Provider cancellation remains unapproved: `.excer/proof/account/2026-09-29_15-10-00/`. |
| A06 | PASS_LOCAL_DEVICE_GAP | Provider failure then retry: `.excer/proof/account/2026-09-29_15-10-00/`. |
| A07 | PASS_LOCAL_DEVICE_GAP | Invalid/expired/superseded/current email challenges: `.excer/proof/account/2026-09-29_15-35-08/`. |
| A08 | PASS_LOCAL | Saved session cannot authorize entry: `.excer/proof/setup/2026-09-29_17-36-26/`, `.excer/proof/setup/2026-09-29_17-36-42/`, `.excer/proof/setup/2026-09-29_17-36-59/`. |
| A09 | PASS_LOCAL_DEVICE_GAP | Checkout identity/link reconciliation: `.excer/proof/paywall/2026-09-29_16-07-06/` and `.excer/proof/account/2026-09-29_14-50-47/`. |
| A10 | PASS_LOCAL_DEVICE_GAP | Existing-provider recovery/conflict stays separated: `.excer/proof/account/2026-09-29_10-47-11/`. |
| A11 | PASS_LOCAL | A/B switch and account-local data: `.excer/proof/dev-harness/2026-09-29_07-55-35/`; checkout proof cannot cross accounts: `.excer/proof/paywall/2026-09-29_09-40-24/`. |
| A12 | PASS_LOCAL_DEVICE_GAP | Linked providers resolve one account: `.excer/proof/account/2026-09-29_14-50-47/`. |
| A13 | PASS_LOCAL_DEVICE_GAP | Existing-provider conflict: `.excer/proof/account/2026-09-29_10-47-11/`. |
| A14 | PASS_LOCAL_DEVICE_GAP | Local sign-out keeps peer session: `.excer/proof/dev-harness/2026-09-29_14-38-12/`. |
| P01 | PASS_LOCAL_DEVICE_GAP | Purchase leads to required sign-in before Setup: `.excer/proof/paywall/2026-09-29_16-07-06/`. |
| P02 | PASS_LOCAL_DEVICE_GAP | Sign-in-first purchase reaches admitted app without a second sign-in: `.excer/proof/paywall/2026-09-29_18-21-34/`. |
| P03 | PASS_LOCAL_DEVICE_GAP | Cancelled purchase stays Paywall: `.excer/proof/paywall/2026-09-29_17-22-26/`. |
| P04 | PASS_LOCAL_DEVICE_GAP | Error then safe retry: `.excer/proof/paywall/2026-09-29_17-08-45/`. |
| P05 | PASS_LOCAL_DEVICE_GAP | Pending purchase grants no access: `.excer/proof/paywall/2026-09-29_09-04-26/`; real Ask to Buy completion remains external. |
| P06 | PASS_LOCAL_DEVICE_GAP | Success without access enters recovery, not Home: `.excer/proof/paywall/2026-09-29_16-06-21/`. |
| P07 | PASS_LOCAL | Double-tap/restore serialization: `.excer/proof/paywall/2026-09-29_16-26-30/`. |
| P08 | PASS_LOCAL_DEVICE_GAP | Interrupted post-payment recovery: `.excer/proof/paywall/2026-09-29_09-05-02/`. |
| P09 | PASS_LOCAL_DEVICE_GAP | Existing subscription reconciles through restore without a new charge: `.excer/proof/paywall/2026-09-29_17-08-10/`. |
| P10 | PASS_LOCAL | Stale A plan handle is rejected before SDK use: `.excer/proof/dev-harness/2026-09-29_17-16-58/`. |
| R01 | PASS_LOCAL_DEVICE_GAP | Restore requires account connection: `.excer/proof/paywall/2026-09-29_17-26-22/`. |
| R02 | PASS_LOCAL_DEVICE_GAP | Established transfer is account-bound: `.excer/proof/dev-harness/2026-09-29_13-57-47/`. Real Adapty transfer policy remains external. |
| R03 | PASS_LOCAL_DEVICE_GAP | Restore not found: `.excer/proof/paywall/2026-09-29_17-26-41/`. |
| R04 | PASS_LOCAL_DEVICE_GAP | Wrong Store account remains unpaid: `.excer/proof/paywall/2026-09-29_17-34-18/`. |
| R05 | PASS_LOCAL_DEVICE_GAP | Failed restore clears its exact journal entry and retries: `.excer/proof/paywall/2026-09-29_17-34-40/`. |
| R06 | PASS_LOCAL | Empty local restore preserves independent verified access: `.excer/proof/dev-harness/2026-09-29_17-35-02/`. |
| R07 | PASS_LOCAL_DEVICE_GAP | Paid same-UID account proof works without local receipt: `.excer/proof/launch/2026-09-29_17-19-03/`. |
| R08 | PASS_LOCAL_DEVICE_GAP | Transfer moves access without source account-local data: `.excer/proof/dev-harness/2026-09-29_13-57-47/`. |
| R09 | PASS_LOCAL_DEVICE_GAP | Source grant is revoked in the transfer diagnostic: `.excer/proof/dev-harness/2026-09-29_13-57-47/`. |
| R10 | PASS_LOCAL_DEVICE_GAP | Passive entry performs no transfer/restore: `.excer/proof/dev-harness/2026-09-29_17-35-27/`. |
| R11 | PASS_LOCAL_DEVICE_GAP | Independent second subscription remains with A: `.excer/proof/dev-harness/2026-09-29_13-56-37/`. |
| R12 | PASS_LOCAL_DEVICE_GAP | Concurrent restores serialize one owner: `.excer/proof/dev-harness/2026-09-29_14-12-14/`. |
| L01 | PASS_LOCAL_DEVICE_GAP | Paid-through boundary is retained then expires: `.excer/proof/dev-harness/2026-09-29_18-13-19/`. |
| L02 | PASS_LOCAL_DEVICE_GAP | Exact short entitlement boundary: `.excer/proof/dev-harness/2026-09-29_18-13-19/`. |
| L03 | PASS_LOCAL_DEVICE_GAP | Open admitted app is replaced by Paywall after denial: `.excer/proof/dev-harness/2026-09-29_18-13-48/`; native shield reconciliation remains physical-device acceptance. |
| L04 | PASS_LOCAL_DEVICE_GAP | Explicit denial clears admission and preserves account-local data: `.excer/proof/dev-harness/2026-09-29_18-13-48/`; live refund/transfer and native enforcement remain external. |
| L05 | PASS_LOCAL | Offline first entry fails closed; failed refresh cannot extend beyond the lease: `.excer/proof/dev-harness/2026-09-29_18-13-19/`. |
| L06 | PASS_LOCAL | Late A callbacks cannot authorize B: `.excer/proof/dev-harness/2026-09-29_09-37-26/`. |
| L07 | PASS_LOCAL | Optional sign-in, enabled reviewer preset, and failed Paywall variant cannot bypass Journey: `.excer/proof/launch/2026-09-29_18-20-49/`. |
| L08 | PASS_LOCAL | Monotonic cap, rollback resistance, and missing expiry: `.excer/proof/dev-harness/2026-09-29_18-13-19/`. |
| G01 | PASS_LOCAL | Generated denial sweep for every protected route: `.excer/proof/launch/2026-09-29_18-20-49/` and `.excer/proof/launch/2026-09-29_11-10-08/`. |
| G02 | PASS_LOCAL | Return/back, notifications, Close, and OTA envelopes: `.excer/proof/launch/2026-09-29_11-24-36/`, `.excer/proof/launch/2026-09-29_12-27-03/`, `.excer/proof/launch/2026-09-29_12-27-50/`, `.excer/proof/launch/2026-09-29_12-09-59/`, `.excer/proof/launch/2026-09-29_12-10-59/`. |
| G03 | PASS_LOCAL | Restricted recovery works without mounting paid Settings: `.excer/proof/account/2026-09-29_12-54-18/`. |
| G04 | PASS_LOCAL | Deletion plus late callbacks cannot resurrect identity/access: `.excer/proof/account/2026-09-29_13-18-48/` and `.excer/proof/dev-harness/2026-09-29_13-20-03/`. |

Local app result: 54 cases have local passing evidence. J05 is blocked on an explicit lifecycle-policy decision. J06 is blocked on real provider/StoreKit foreground-resume evidence. Every `PASS_LOCAL_DEVICE_GAP` still needs the corresponding case in the 18-case physical-device manifest; simulator fixtures do not close it.

## Server cases (12)

The current local server evidence is `server/evidence/hard-paywall-subscription-proof/README.md`. The smoke runs the built server against throwaway Postgres and stub vendors and queries database effects.

| ID | Status | Evidence or exact gap |
| --- | --- | --- |
| S01 | PASS_LOCAL | Valid canonical and anonymous JWT subjects provision only their own token subject; client UID claims are rejected. |
| S02 | PASS_LOCAL | Missing, forged, expired, wrong-issuer, wrong-audience, and tombstoned credentials are denied. |
| S03 | PASS_LOCAL | Client environment/account/UID/active/expiry/owner fields are rejected. |
| S04 | PASS_LOCAL | Production and Sandbox rows and server authorization processes are independently keyed. |
| S05 | PASS_LOCAL | Authenticated webhook, idempotent replay, and newer-denial ordering are asserted in the database. |
| S06 | PASS_LOCAL | Empty/unbound profile aggregate stays unavailable; only environment-bound webhook mirror authorizes. Live v2 payload compatibility remains a release check. |
| S07 | BLOCKED_EXTERNAL | No authenticated purchase-confirmation transport exists beyond profile resync/webhook mirror. Real confirmation delay/timeout requires the StoreKit/Adapty spike and, if chosen, a coordinator design. |
| S08 | BLOCKED_EXTERNAL | Transfer is currently vendor-owned. Correct claimant/old-grant invalidation cannot be certified locally until live Adapty transfer behavior settles whether a server coordinator is required. |
| S09 | BLOCKED_EXTERNAL | Local mirror ordering/denial and independent environments pass, but refund/grace plus independent second-subscription aggregation requires live vendor observations or the selected coordinator contract. |
| S10 | PASS_LOCAL | Deletion removes grants, preserves an unlinkable delivery ledger, creates a tombstone, and rejects resurrection. |
| S11 | PASS_LOCAL | Route rate limit plus stubbed Adapty 429/500/timeout/malformed responses all fail closed with the same non-enumerating response and no grant. |
| S12 | PASS_LOCAL | No raw payload/receipt/credential columns, no copied email, rejected location diagnostics, and database erasure effects are asserted. Log redaction on the release process remains operational acceptance. |

Local server result: nine cases pass locally. S07–S09 are not implemented claims; they are blocked on authoritative live ownership/transfer evidence and the resulting proof-transport decision.
