Live retry — read-only, 10/10 commands used, no mutations/edits/secrets/subagents.

**Auth: FIXED vs prior report**
- `asc auth status`: `System Keychain`, credential `Regen ASC / WS84Q5HBPM / isDefault:true` — prior `-50` keychain failure resolved. This is host keychain access, not env keys.

**Subscriptions live (`asc subscriptions list --app 6787265352`)**
- 51 rows, ALL `MISSING_METADATA` — confirms prior last-known.
- Six mapped with ASC IDs (new live fact, absent from `docs/subscriptions.md`):
  - `a.monthly` 6796884508 / `a.annual` 6796884321 / `a.winback.annual` 6796884396
  - `b.monthly` 6796884291 / `b.annual` 6796884452 / `b.winback.annual` 6796884509

**Groups live**
- 3 groups: `22372981 ExcerLock Premium`, `22279282 Variant A`, `22279120 Variant B` — resolves prior “A/B IDs unrecorded” gap.

**Versions live (×6)**
- All v1 `PREPARE_FOR_SUBMISSION`:
  - 4321:`331149cd-…`, 4396:`0c4ddc0d-…`, 4508:`04a66d78-…`, 4452:`c0be6ae6-…`, 4509:`8034537e-…`, 4291:`e7c305ce-…`

**Version localizations live (×6): en-US PRESENT**
- Annuals: `Premium Annual / Earn screen time by moving. Billed yearly.`
- Monthlies: `Premium Monthly / … Billed monthly.`
- Winbacks: `Premium Annual Offer / Discounted yearly plan for returning members.`
- Correction to prior report: name/description are NOT missing.

**Review screenshots live (×6): NONE**
- `versions images list` empty table for all six — confirms blocking gap. Local `./review.png` still absent per prior report.

**Group versions**
- A:`c8d470aa-…` PREPARE, B:`207f9cf9-…` PREPARE.
- A loc: `en-US / ExcerLock Premium / ExcerLock` present. B loc unchecked (command budget).

**Pricing: INCONCLUSIVE**
- `pricing prices list` per six returns many `UPFRONT` rows but `Territory/Price Point` blank in table view — US base price ($9.99/$59.99/$29.99/$12.99/$79.99/$39.99 per README) not live-confirmed. Need `pricing summary --app` JSON or correct `view --id` flags.

**Agreements/banking/tax: UNKNOWN — missing web auth, not sandbox**
- Exact error: `Error: password is required: run in a terminal for an interactive prompt or set ASC_WEB_PASSWORD`
- Distinct from prior sandbox `-50`; needs interactive web session / `ASC_WEB_PASSWORD` or cached session. Banking/tax same.

**Gaps left (no budget)**
- B group localization, US price points, Adapty products/paywalls, 45-grid untouched as ordered.
