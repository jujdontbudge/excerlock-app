import { Entitlement, LockedApps, Permissions, Session } from '../domain/types';
import { HistoryDay, Unsubscribe } from './models';
export type FakePrompt = { kind: 'permission'; name: keyof Permissions } | { kind: 'picker'; initial: LockedApps };
export type RuntimeEvent = { at: string; event: string; props: Record<string, unknown> };
export type DevSnapshot = {
  scenarioId: string;
  promptMode: 'grant' | 'deny' | 'ask';
  prompt: FakePrompt | null;
  events: RuntimeEvent[];
  history: HistoryDay[];
  accessibility?: 'xl' | 'reduceMotion';
  outcome: 'success' | 'cancel' | 'error';
  presence: 'inside' | 'outside';
};
export interface RuntimeControls {
  scenarios: { id: string; title: string }[];
  load(id: string, keepEdits?: boolean): Promise<void>;
  advance(ms: number): void;
  setTime(now: string, timezone?: string): void;
  setPromptMode(mode: DevSnapshot['promptMode']): void;
  setPermission(name: keyof Permissions, status: Permissions[keyof Permissions]): void;
  setEntitlement(status: Entitlement['status']): void;
  setSession(session: Session): void;
  setOutcome(outcome: DevSnapshot['outcome']): void;
  resolvePrompt(result: boolean | LockedApps): void;
  snapshot(): DevSnapshot;
  subscribe(callback: () => void): Unsubscribe;
}
