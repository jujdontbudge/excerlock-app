import { Rule, WalkingSession } from '../../domain/types';
import { WalkingPort } from '../WalkingPort';

export type WalkingContractHarness = {
  port: WalkingPort;
  rule: Rule;
  /** End of the rule instance the harness starts inside; the suite asserts teardown against it. */
  windowEnd: string;
  now(): string;
  advance(milliseconds: number): void;
  signal(type: 'verified' | 'unverified' | 'tick'): void;
  session(): WalkingSession | null;
  progress(): number;
  dispose(): void;
};

export function walkingContract(name: string, create: () => WalkingContractHarness) {
  describe(`${name} WalkingPort contract`, () => {
    let harness: WalkingContractHarness;
    beforeEach(() => {
      harness = create();
    });
    afterEach(() => harness.dispose());

    test('a verified event renews a live lease', async () => {
      const started = await harness.port.start(harness.rule);
      harness.advance(14 * 60_000);
      harness.signal('verified');
      expect(harness.session()?.leaseUntil).toBe(
        new Date(Date.parse(started.startedAt) + 29 * 60_000).toISOString(),
      );
    });

    test('a lapsed lease cannot be revived', async () => {
      const started = await harness.port.start(harness.rule);
      harness.advance(15 * 60_000);
      harness.signal('verified');
      expect(harness.session()).toMatchObject({
        phase: 'ended',
        leaseUntil: started.leaseUntil,
        endReason: 'leaseLapsed',
      });
    });

    test('credit is idempotent across replay', async () => {
      await harness.port.start(harness.rule);
      harness.signal('verified');
      harness.advance(5 * 60_000);
      harness.signal('tick');
      const progress = harness.progress();
      harness.signal('tick');
      expect(harness.progress()).toBe(progress);
    });

    test('a propped scan credits from verification while an unfinished scan credits zero', async () => {
      await harness.port.start(harness.rule, { placement: 'propped' });
      harness.advance(2 * 60_000);
      expect(harness.progress()).toBe(0);
      expect(harness.port.completeProppedScan()).toBe(true);
      harness.advance(12 * 60_000);
      expect(harness.progress()).toBe(12);
    });

    test('window end stops the session with lease time still remaining', async () => {
      await harness.port.start(harness.rule);
      harness.signal('verified');
      harness.advance(14 * 60_000);
      harness.signal('verified');
      harness.advance(14 * 60_000);
      harness.signal('verified'); // lease now outlives the window
      harness.advance(16 * 60_000);
      expect(harness.session()).toMatchObject({
        phase: 'ended',
        endReason: 'windowEnded',
        endedAt: harness.windowEnd,
      });
    });

    test('start before the scheduled lease horizon returns notScheduled', async () => {
      harness.advance(-3 * 60 * 60_000);
      await expect(harness.port.start(harness.rule)).rejects.toMatchObject({ code: 'notScheduled' });
    });
  });
}
