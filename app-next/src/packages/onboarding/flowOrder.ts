import { preBranch, tail, type FlowOrder } from './lib/flow';
import { isOnboardingStepId } from './lib/stepId';

import type { OnboardingFlowPort } from '../ports/OnboardingFlowPort';

const knownPreBranch: ReadonlySet<string> = new Set(preBranch);
const knownTail: ReadonlySet<string> = new Set(tail);
export type { OnboardingFlowPort };

export interface OnboardingFlowPortDeps {
  readPayload(): Promise<unknown>;
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
  if (order.preBranch[0] !== 'O01' || !['O04', 'O10', 'O20', 'O22'].every((step) => order.preBranch.includes(step))) return null;
  if (['O11', 'O12', 'O13', 'O14'].some((step) => order.preBranch.includes(step) && order.preBranch.indexOf(step) < order.preBranch.indexOf('O10'))) return null;
  return order;
}

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
