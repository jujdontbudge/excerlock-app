## Phase 4: Implement — stage by stage

**If `migrationSource` is not empty and `paywallApproach` is not `observer`:** you are replacing, not inserting. Work call site by call site — swap each of the source's calls for its Adapty equivalent, then remove the source from the dependencies and delete the code that is now dead. The stage order and checkpoints below still apply. When a call site does not map one-to-one, read `references/migration-architecture.md`.

One call site is not a swap: if `paywallApproach` is `flow_builder` and the app renders its paywall screen itself, that screen is being retired rather than rewired, and fetch, presentation, purchase, and entitlement gating move together or not at all. Read `references/migration-flow-rebuild.md` before you edit it.

**If `migrationSource` is not empty and `paywallApproach` is `observer`:** delete nothing. The user chose to keep their existing purchase infrastructure, so the source's purchase code stays in place and only event tracking routes through Adapty, per the platform reference's Observer mode section.

Follow the platform-specific file for the exact doc URLs and implementation order. For each stage:

1. **Read the listed docs** (fetch the `.md` URLs) before writing any code
2. **Implement** the stage
3. **Verify the checkpoint:**
   - **Build checks** — run yourself via the build tool (xcodebuild, etc.); do not ask the user to build
   - **Visual/functional checks** (e.g. "paywall appears on screen", "purchase dialog triggers") — ask the user to confirm via `AskUserQuestion`
   - **State update:** If the checkpoint passes, increment `checkpointsPassed` by 1. When all stages in Phase 4 are complete, set `phasesCompleted = 4`.
4. Only then move to the next stage

Never skip a checkpoint. A failed checkpoint means something is wrong that will cascade.

