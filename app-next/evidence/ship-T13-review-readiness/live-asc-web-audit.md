# Live ASC and public-service audit — 2026-09-10

Read-only; app `6787265352`, team `AX3C2B78YD`. No release/submission mutation.

## Authoritative results

- Root's portal evidence confirms **Family Controls distribution approval** for all five bundle IDs, not merely capability assignment.
- Root's web audit confirms agreements, banking, W-9 and DSA are active. This lane could not independently reopen the web session (`--apple-id` required), so it preserves rather than downgrades that authoritative result.
- Version `1.0` (`c216ad37-…`) is `PREPARE_FOR_SUBMISSION`, has no attached build/submission in the included API response, and has **zero App Store screenshots**.
- The six intended subscriptions exist. Each version is `PREPARE_FOR_SUBMISSION`, but each product is `MISSING_METADATA`; all six image lists contain zero images. Localized names/descriptions exist.
- Live US prices match plan exactly: A monthly/annual/winback `$9.99/$59.99/$29.99`; B `$12.99/$79.99/$39.99`.
- Before correction, live version metadata was stale and materially inaccurate: description said “No account. No server. Nothing to sign up for,” and all URLs pointed to `johansardar.github.io`.

## Authorized correction and read-back

Under `scripts/agent-ops.py run`, only the existing en-US version localization and existing en-US App Info localization were updated. Description, keywords and promotional text now describe walking/gym conditions, optional analytics, anonymous/linkable identity, and subscriptions without promising unsupported activities. Support, marketing and privacy URLs now use `excerlock.com`. `asc-version-{before,after}.json` and `asc-app-info-{before,after}.json` preserve the API read-back; unrelated fields/locales were not mutated.

## Public URL and service semantics

- `https://excerlock.com/privacy`, `/terms`, `/support`: HTTP 200 HTML with correct titles and mail contacts.
- `https://api.excerlock.com/v1/health`: HTTP 200 `ok:true`; `/v1/ready`: HTTP 200 `ready:true`. These prove process/database readiness only, not device account deletion or downstream erasure.
- AASA returns HTTP 200 JSON, the correct app ID, and intentional `paths: []`. `02-native-manifest.md` explicitly says empty applinks are correct for this version: the app has no supported web-to-app route, so broadening this list would invent product behavior.

## Exact root action order after signed-binary gates

1. Capture and approve release-build App Store screenshots; upload to version localization `da0f8b3a-…` with `asc screenshots upload --version-id c216ad37-… --locale en-US --path <approved-dir> --device-type IPHONE_65`.
2. Upload the approved paywall review image to each subscription version using `asc subscriptions versions images upload --version-id <VID> --file <review.png>` for `331149cd-…`, `0c4ddc0d-…`, `04a66d78-…`, `c0be6ae6-…`, `8034537e-…`, `e7c305ce-…`. Re-list and require all six products to become `READY_TO_SUBMIT`.
3. ~~Replace description/keywords/promotional text and canonical URLs.~~ Completed read-back under the operations lock; the false “No account. No server” claim is gone and canonical URLs are configured.
4. Keep AASA `paths: []` until an actual native universal-link route is implemented and specified. OAuth callbacks live on `api.excerlock.com` and are server routes, not app universal links.
5. Create/complete App Review detail from `docs/asc/review-notes.md`, attach the signed build, create the submission, and add all six `subscriptionVersions` review items (and required group versions). Re-read relationships before submitting.

The other 45 subscription products were read but not changed and must remain untouched absent a separate product decision.
