"""E2E-E2 — OTA receipt, binary unchanged: documented stub (deliberately not run).

The plan (§7.2, §3.3) requires a real preview-channel EAS Update publication for
this scenario: publish a visible JS change, install the update on the device,
prove `CFBundleVersion` is unchanged, prove `update_id` changes in subsequent
events and that `expo-v11.db` records a successful launch, and prove the reload
happened only at a safe route.

That publication is out of scope for this harness (brief: no EAS build or update;
§8.10 keeps release-lock operations out of E2E automation) and it must be
serialized under the release lock. The scenario therefore reports BLOCKED with
the exact prerequisite instead of pretending to run; `verify-ota.sh` remains the
artifact-level proof contract for the publish itself.
"""
from __future__ import annotations

from harness import Scenario, RunContext


class E2OtaReceiptStub(Scenario):
    id = 'E2E-E2'
    title = 'OTA receipt, binary unchanged (documented stub — publishes an EAS update)'
    lane = 'SIM'
    users = 'EXISTING'
    fixture = 'none'
    blocked_reason = (
        'deliberately not automated: this scenario publishes a preview-channel EAS Update '
        '(plan §3.3/§7.3), which is out of scope here (no EAS build/update, no release-lock operations) '
        'and must be serialized under the release lock. Prerequisites for a future run: (1) an '
        'existing-user fixture, (2) `eas update --channel preview` executed inside '
        '`python3 scripts/agent-ops.py run -- ...`, (3) app-next/scripts/verify-ota.sh artifacts '
        '(IPA + both expo-v11.db exports) for the binary-unchanged proof.'
    )

    def run(self, ctx: RunContext) -> None:
        ctx.verdict.block(self.blocked_reason)
        ctx.note('stub: see module docstring and app-next/scripts/verify-ota.sh')
