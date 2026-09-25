export type CheckResult =
  | { kind: 'pass'; note?: string }
  | { kind: 'fail'; problems: string[] }
  | { kind: 'count'; ratchet: string; value: number; samples: string[] };

export type Check = {
  name: string;
  why: string;
  tier: 'static' | 'full';
  run(): CheckResult | Promise<CheckResult>;
};

export const pass = (note?: string): CheckResult => (note === undefined ? { kind: 'pass' } : { kind: 'pass', note });

export const verdict = (problems: string[], note?: string): CheckResult =>
  problems.length > 0 ? { kind: 'fail', problems } : pass(note);
