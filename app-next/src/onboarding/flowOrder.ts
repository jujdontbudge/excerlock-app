import { preBranch, tail, type FlowOrder } from './flow';
import { isOnboardingStepId } from './stepId';

/** The payload may only reorder/drop steps inside the group it names. */
const knownPreBranch: ReadonlySet<string> = new Set(preBranch);
const knownTail: ReadonlySet<string> = new Set(tail);

/**
 * The remote onboarding rail consumed by `useOnboarding` (B8).
 *
 * `order()` is the assignment currently in effect, or `null` for the bundled
 * order. Subscribers are notified once per app run, because `load()` settles
 * at most one order: the rail must never change under a user mid-flow.
 */
export interface OnboardingFlowPort {
  order(): FlowOrder | null;
  load(): Promise<FlowOrder | null>;
  subscribe(listener: (order: FlowOrder | null) => void): () => void;
}

export interface OnboardingFlowPortDeps {
  /** Reads the `onboarding_variant` payload through the allow-listed flags controller. */
  readPayload(): Promise<unknown>;
  /**
   * Waits for the identity spine before the single retry. A fresh install reads
   * the flag before the spine has settled, and the controller answers nothing
   * while the identity is provisional, so without this the rail would never
   * apply to the users it is meant for. Callers bound their own wait.
   */
  awaitReady?(): Promise<void>;
}

function readGroup(value: unknown, known: ReadonlySet<string>): readonly string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const steps: string[] = [];
  for (const candidate of value) {
    if (!isOnboardingStepId(candidate) || !known.has(candidate) || steps.includes(candidate)) return null;
    steps.push(candidate);
  }
  return steps;
}

/**
 * Validates one `onboarding_variant` payload.
 *
 * Accepted shape: an object naming `preBranch` and/or `tail`, each a non-empty
 * list of unique step ids drawn from that group's bundled set. A group the
 * payload omits keeps its bundled order. The tail must still end at `P`, so an
 * operator can reorder or drop trial steps but can never strand the user
 * without the paywall that ends onboarding. Everything else — unknown keys, a
 * wrong-group id, a duplicate, an empty list, a non-array, a missing payload —
 * returns `null` and the bundled order stays in force.
 */
export function parseOnboardingFlowOrder(payload: unknown): FlowOrder | null {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== 'preBranch' && key !== 'tail')) return null;
  const parsedPre = record.preBranch === undefined ? undefined : readGroup(record.preBranch, knownPreBranch);
  const parsedTail = record.tail === undefined ? undefined : readGroup(record.tail, knownTail);
  if (parsedPre === null || parsedTail === null) return null;
  if (parsedPre === undefined && parsedTail === undefined) return null;
  const order: FlowOrder = { preBranch: parsedPre ?? [...preBranch], tail: parsedTail ?? [...tail] };
  if (order.tail[order.tail.length - 1] !== 'P') return null;
  return order;
}

/**
 * Reads and validates the remote flow order once per app run.
 *
 * Nothing ever awaits `load()` before rendering: the caller keeps painting the
 * bundled order and re-renders from `subscribe` when a valid payload settles.
 * `awaitReady` is attempted once between two reads, so a payload that arrives
 * that late still applies instead of being dropped.
 */
export function createOnboardingFlowPort(deps: OnboardingFlowPortDeps): OnboardingFlowPort {
  const listeners = new Set<(order: FlowOrder | null) => void>();
  let settled: FlowOrder | null = null;
  let loaded = false;
  let inFlight: Promise<FlowOrder | null> | null = null;
  const publish = (order: FlowOrder | null) => {
    if (loaded) return;
    loaded = true;
    settled = order;
    for (const listener of [...listeners]) listener(settled);
  };
  const read = async (): Promise<FlowOrder | null> => {
    const first = parseOnboardingFlowOrder(await deps.readPayload());
    if (first) return first;
    if (!deps.awaitReady) return null;
    try {
      await deps.awaitReady();
    } catch {
      return null;
    }
    return parseOnboardingFlowOrder(await deps.readPayload());
  };
  return {
    order: () => settled,
    load() {
      if (loaded) return Promise.resolve(settled);
      if (inFlight) return inFlight;
      inFlight = read()
        .catch(() => null)
        .then((order) => {
          publish(order);
          return settled;
        })
        .finally(() => {
          inFlight = null;
        });
      return inFlight;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
