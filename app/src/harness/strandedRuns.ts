import type { HarnessRun } from "./HarnessRunEngine";
import type { HarnessRunStore } from "./HarnessRunStore";

type RunReconciler = Pick<HarnessRunStore, "list" | "save">;

/**
 * A run ends only when something is alive to notice. An app killed while
 * suspended — or crashed, or rebuilt onto the phone — leaves its last saved
 * copy with no `endedAtMs`, and a window that never closed is a window the
 * analyzer cannot bound and the tester cannot trust.
 *
 * The next launch closes every such run at the last instant there is evidence
 * for, and says `stranded` rather than inventing a clean end: nothing was
 * recorded after the last event, so nothing later can be claimed.
 */
export async function finalizeStrandedRuns(
  store: RunReconciler,
): Promise<readonly HarnessRun[]> {
  const stranded = (await store.list())
    .filter((run) => run.endedAtMs === undefined)
    .map(strand);
  await Promise.all(stranded.map((run) => store.save(run)));
  return stranded;
}

function strand(run: HarnessRun): HarnessRun {
  return {
    ...run,
    endedAtMs: run.events.reduce(
      (latest, event) => Math.max(latest, event.atMs),
      run.startedAtMs,
    ),
    endReason: "stranded",
  };
}

export type HarnessRunOutcome = Readonly<{
  label: string;
  needsAttention: boolean;
}>;

/**
 * The task list must not file an unwatched end under the ordinary ones. A run
 * whose end was reconstructed, or never reached at all, is a result the tester
 * has to look at before trusting anything the run says.
 */
export function describeRunOutcome(run: HarnessRun): HarnessRunOutcome {
  if (run.endReason === undefined || run.endedAtMs === undefined) {
    return { label: "in progress · needs attention", needsAttention: true };
  }
  if (run.endReason === "stranded") {
    return { label: "stranded · needs attention", needsAttention: true };
  }
  return { label: run.endReason, needsAttention: false };
}
