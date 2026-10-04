export interface GymTransitionRecord {
  readonly id: string;
  readonly regionId: string;
  readonly type: 'enter' | 'exit';
  readonly atMs: number;
  readonly receivedAtMs: number;
}
export interface GymVisitLog {
  append(record: GymTransitionRecord, manualEpoch?: number): Promise<void>;
  readAll(): Promise<readonly GymTransitionRecord[]>;
}
