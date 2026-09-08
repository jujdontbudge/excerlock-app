import { rateManually, startReviewPrompts } from '../reviewPrompts';
import { createRuntime } from '../../../runtime/createRuntime';
import { historyStore } from '../../../state/historyStore';
import { reviewStore } from '../../../state/reviewStore';
import { ruleDaysStore } from '../../../state/ruleDaysStore';
import { rulesStore } from '../../../state/rulesStore';
import { StoreReviewModule } from '../nativeReview';
import { RuleDay } from '../../../domain/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

beforeEach(async () => {
  await AsyncStorage.clear();
  reviewStore.getState().reset();
});

function nativeStub(available = true) {
  const calls: string[] = [];
  const native: StoreReviewModule = {
    isAvailable: async () => {
      calls.push('isAvailable');
      return available;
    },
    requestReview: async () => {
      calls.push('requestReview');
    },
    openWriteReview: async () => {
      calls.push('openWriteReview');
    },
  };
  return { native, calls };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function runtimeWithRule() {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  reviewStore.getState().reset();
  const rule = rulesStore.getState().data.rules[0];
  const today = runtime.clock.now().slice(0, 10);
  const metRow = (day: string): RuleDay => ({
    ruleId: rule.id,
    day,
    progress: 1,
    met: true,
    metAt: `${day}T10:00:00.000Z`,
  });
  /**
   * Four met days already sealed. The policy counts met days in the history the runtime keeps, not in
   * the rule days it prunes at 35 days, so the fifth day is the one the user meets today.
   */
  const fourMetDays = () =>
    historyStore.getState().patch({
      days: ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'].map((day) => ({
        day,
        usageMinutes: null,
        activity: { walking: 5000, gym: 0, running: 0, biking: 0 },
        met: true,
        scheduled: true,
        sealedAt: `${day}T23:59:59.000Z`,
      })),
    });
  historyStore.getState().patch({ days: [] });
  return { runtime, rule, today, metRow, fourMetDays };
}

test('the first launch records the install date and prompts nothing', async () => {
  const { runtime } = await runtimeWithRule();
  const { native, calls } = nativeStub();
  const stop = startReviewPrompts(runtime, native);
  await flush();
  expect(reviewStore.getState().data.installedAt).toBe(runtime.clock.now());
  expect(calls).toEqual([]);
  stop();
  runtime.dispose();
});

test('the fifth met day on an old install prompts once, records it and emits the analytics event', async () => {
  const { runtime, today, metRow, fourMetDays } = await runtimeWithRule();
  reviewStore.getState().patch({ installedAt: '2020-01-01T00:00:00.000Z' });
  const { native, calls } = nativeStub();
  const stop = startReviewPrompts(runtime, native);
  await flush();
  fourMetDays();
  await flush();
  expect(calls).toEqual([]);
  ruleDaysStore.getState().patch({ days: [metRow(today)] });
  await flush();
  expect(calls).toEqual(['isAvailable', 'requestReview']);
  expect(reviewStore.getState().data.promptCount).toBe(1);
  expect(runtime.dev.snapshot().events.filter((e) => e.event === 'rating_prompt_shown')).toEqual([
    expect.objectContaining({ props: { source: 'unlock_moment' } }),
  ]);
  ruleDaysStore.getState().patch({ days: [metRow(today), metRow('2026-09-05')] });
  await flush();
  expect(calls.filter((c) => c === 'requestReview')).toHaveLength(1);
  stop();
  runtime.dispose();
});

test('an unavailable store review never claims a prompt', async () => {
  const { runtime, today, metRow, fourMetDays } = await runtimeWithRule();
  reviewStore.getState().patch({ installedAt: '2020-01-01T00:00:00.000Z' });
  const { native, calls } = nativeStub(false);
  const stop = startReviewPrompts(runtime, native);
  fourMetDays();
  ruleDaysStore.getState().patch({ days: [metRow(today)] });
  await flush();
  expect(calls).not.toContain('requestReview');
  expect(reviewStore.getState().data.promptCount).toBe(0);
  stop();
  runtime.dispose();
});

test('a stopped binding ignores later store changes', async () => {
  const { runtime, today, metRow, fourMetDays } = await runtimeWithRule();
  reviewStore.getState().patch({ installedAt: '2020-01-01T00:00:00.000Z' });
  const { native, calls } = nativeStub();
  startReviewPrompts(runtime, native)();
  fourMetDays();
  ruleDaysStore.getState().patch({ days: [metRow(today)] });
  await flush();
  expect(calls).toEqual([]);
  runtime.dispose();
});

test('a manual Rate opens the write-review page, records the tap and ends automatic prompts', async () => {
  const { runtime, today, metRow, fourMetDays } = await runtimeWithRule();
  reviewStore.getState().patch({ installedAt: '2020-01-01T00:00:00.000Z' });
  const { native, calls } = nativeStub();
  await rateManually(runtime, native);
  expect(calls).toEqual(['openWriteReview']);
  expect(reviewStore.getState().data.manualRateTapped).toBe(true);
  expect(runtime.dev.snapshot().events.at(-1)).toMatchObject({
    event: 'rating_prompt_shown',
    props: { source: 'settings' },
  });
  const stop = startReviewPrompts(runtime, native);
  fourMetDays();
  ruleDaysStore.getState().patch({ days: [metRow(today)] });
  await flush();
  expect(calls).toEqual(['openWriteReview']);
  stop();
  runtime.dispose();
});
