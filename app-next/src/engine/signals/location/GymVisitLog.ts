export interface GymTransitionRecord {
  readonly id: string;
  readonly regionId: string;
  readonly type: 'enter' | 'exit';
  /** Observed transition/delivery time, not exact boundary-crossing time. */
  readonly atMs: number;
  readonly receivedAtMs: number;
}
export interface GymVisitLog {
  append(record: GymTransitionRecord): Promise<void>;
  readAll(): Promise<readonly GymTransitionRecord[]>;
}
