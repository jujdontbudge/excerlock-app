import { Entitlement, LockedApps, Permissions, Session } from '../model/types';
import { HistoryDay, Unsubscribe } from '../model/models';
import { GaitPort } from './GaitPort';
import { RuntimeStatusPort, RuntimeStatusSnapshot } from './RuntimeStatusPort';
export type FakePrompt =
  { kind: 'permission'; name: keyof Permissions; scope?: 'always' } | { kind: 'picker'; initial: LockedApps };
export type RuntimeEvent = { at: string; event: string; props: Record<string, unknown> };
export type DevSnapshot = RuntimeStatusSnapshot & {
  stepsOverride?: { value: number; day: string; at: string };
  scenarioId: string;
  promptMode: 'grant' | 'deny' | 'ask';
  prompt: FakePrompt | null;
  events: RuntimeEvent[];
  history: HistoryDay[];
  accessibility?: 'xl' | 'reduceMotion';
  restoreOutcome: 'restored' | 'notFound';
  outcome: 'success' | 'cancel' | 'error';
  presence: 'inside' | 'outside';
  motion: 'walking' | 'still';
  placement?: 'propped' | 'handheld';
  accountData?: {
    active: 'A' | 'B' | 'Checkout' | 'None';
    legacyQuarantined: boolean;
    checkpoints?: string;
    switchOrdering?: string;
    activityCheckpoints?: string;
  };
  subscriptionLab?: {
    purchases: number;
    restores: number;
    queued: number;
    delivered: number;
    callbackIsolation?: string;
  };
};
export interface RuntimeControls extends RuntimeStatusPort {
  scenarios: { id: string; title: string }[];
  load(id: string, keepEdits?: boolean): Promise<void>;
  advance(ms: number): void;
  setSteps(value: number): void;
  setPresence(value: 'inside' | 'outside'): void;
  setMotion(value: 'walking' | 'still'): void;
  setGait(value: 'none' | 'walking' | 'still'): void;
  createGaitPreview(): GaitPort;
  setPlacement(value: 'propped' | 'handheld'): void;
  setTime(now: string, timezone?: string): void;
  setPromptMode(mode: DevSnapshot['promptMode']): void;
  setPermission(name: keyof Permissions, status: Permissions[keyof Permissions]): void;
  setEntitlement(status: Entitlement['status']): void;
  setSession(session: Session): void;
  setRestoreOutcome(outcome: DevSnapshot['restoreOutcome']): void;
  setOutcome(outcome: DevSnapshot['outcome']): void;
  useLabAccount(account: 'A' | 'B'): Promise<void>;
  seedLabAccount(account: 'A' | 'B'): Promise<void>;
  runLabAccountIsolation(): Promise<void>;
  runLabAccountSwitchOrdering(): Promise<void>;
  runLabDelayedCallbackIsolation(): Promise<void>;
  resolvePrompt(result: boolean | LockedApps): void;
  snapshot(): DevSnapshot;
  subscribe(callback: () => void): Unsubscribe;
}
