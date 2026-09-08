# Pending P2-T15 (temporary)

`build/P2-T05` forked from `rebuild/phase-2` at a commit that predates the session-and-credit
engine, and `build/P2-T15` does not merge into `rebuild/phase-2` cleanly (17 files conflict, all of
them owned by T15, T16, T19 and T24). Rather than resolve someone else's integration inside a task
branch, the adapters are written against copies of the T15 surface kept here.

Everything in this directory is either a copy of a P2-T15 file or a declaration of a shape P2-T15
owns. Nothing outside `src/adapters/` is touched, so this directory cannot conflict with T15.

This is the only stand-in left. P2-T03 has been merged, so `engine/contracts.ts` names the real
engine types and `nativeEngine.ts` binds the real providers.

| File | P2-T15 home |
| --- | --- |
| `types.ts` | `domain/types.ts`, `ports/models.ts`, `ports/{Walking,Gym,Health}Port.ts` |
| `lease.ts` | `domain/sessions/lease.ts` (verbatim) |
| `walkingSession.ts` | `domain/sessions/walkingSession.ts` (verbatim but for one import) |
| `gymDwell.ts` | `domain/gymDwell.ts` (verbatim but for the `localInstant` shim) |
| `contracts/*.ts` | `ports/__tests__/*.ts` (verbatim but for imports) |

## When P2-T15 lands

`__tests__/landed.test.ts` fails as soon as `src/domain/sessions/walkingSession.ts` exists, so this
cannot be forgotten. The cleanup:

1. Delete `src/adapters/pending/`.
2. Repoint the adapter imports at `domain/types`, `domain/sessions/walkingSession`,
   `domain/gymDwell`, `ports/*Port` and `ports/__tests__/*Contract`.
3. Bind `gym/GymAdapter`'s `VisitLog` to `state/gymVisitsStore` with `visitLogFromStore`; delete the
   in-memory default.
4. Run `npm run typecheck` and `npm test`. No adapter logic changes, and none of the fixture
   replay tests move: they already run against the real engine.
