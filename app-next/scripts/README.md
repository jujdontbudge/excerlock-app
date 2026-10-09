# Development scripts

Release, catalog and research helpers. Drive the simulator with `./excer sim`, not with scripts here.

- **Catalog:** `catalog-drift.py` compares the App Store Connect, Adapty and StoreKit product identifiers. `subscription-metadata.py` checks the metadata behind those identifiers for every SKU — grid-derived `en-US` display name, description, group, group order and introductory offer, and `READY_TO_SUBMIT` state — and `subscription-metadata.py --fill` applies only missing or differing fields (it never touches a `READY_TO_SUBMIT` subscription, a price or availability). Run them through `npm run catalog:*`.
- **Release checks:** `verify-binary.sh` audits a built payload (entitlements, Info.plist, privacy manifest, signed manifest, bundle size, no linked trace). `verify-ota.sh` proves an OTA update on installed phones (`docs/ota.md`). `verify-no-dev-bundle.cjs` and `upload-sourcemaps.sh` support release builds. `eas-secrets.ts` uploads only the allowlisted client variables to EAS.
- **Startup:** `measure-startup.sh` and `startup-stage-medians.cjs` (ADR 0033, 0037, 0038).
- **Linked recorder research:** `build-linked-recorder-standalone.sh`, `prove-linked-recorder-on-phone.sh` and their helpers (`research/linked-recorder/README.md`).
- **Other:** `storekit-sim.sh` (`storekit/README.md`), `audit-privacy-manifest.py` (`privacy/README.md`), `export-icons.cjs` (`assets/icons/FOUNDRY.md`), `check-env.ts` (CI).
