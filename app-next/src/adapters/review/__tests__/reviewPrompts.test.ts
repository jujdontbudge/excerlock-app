import { rateManually, startReviewPrompts } from '../reviewPrompts';
import { createRuntime } from '../../../runtime/createRuntime';
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
  return { runtime, rule, today, metRow };
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
  const { runtime, today, metRow } = await runtimeWithRule();
  reviewStore.getState().patch({ installedAt: '2020-01-01T00:00:00.000Z' });
  const { native, calls } = nativeStub();
  const stop = startReviewPrompts(runtime, native);
  await flush();
  const days = [1, 2, 3, 4].map((n) => metRow(`2026-01-0${n}`));
  ruleDaysStore.getState().patch({ days });
  await flush();
  expect(calls).toEqual([]);
  ruleDaysStore.getState().patch({ days: [...days, metRow(today)] });
  await flush();
  expect(calls).toEqual(['isAvailable', 'requestReview']);
  expect(reviewStore.getState().data.promptCount).toBe(1);
  expect(runtime.dev.snapshot().events.filter((e) => e.event === 'rating_prompt_shown')).toEqual([
    expect.objectContaining({ props: { source: 'unlock_moment' } }),
  ]);
  ruleDaysStore.getState().patch({ days: [...days, metRow(today), metRow('2026-01-05')] });
  await flush();
  expect(calls.filter((c) => c === 'requestReview')).toHaveLength(1);
  stop();
  runtime.dispose();
});

test('an unavailable store review never claims a prompt', async () => {
  const { runtime, today, metRow } = await runtimeWithRule();
  reviewStore.getState().patch({ installedAt: '2020-01-01T00:00:00.000Z' });
  const { native, calls } = nativeStub(false);
  const stop = startReviewPrompts(runtime, native);
  ruleDaysStore.getState().patch({ days: [1, 2, 3, 4].map((n) => metRow(`2026-01-0${n}`)).concat(metRow(today)) });
  await flush();
  expect(calls).not.toContain('requestReview');
  expect(reviewStore.getState().data.promptCount).toBe(0);
  stop();
  runtime.dispose();
});

test('a stopped binding ignores later store changes', async () => {
  const { runtime, today, metRow } = await runtimeWithRule();
  reviewStore.getState().patch({ installedAt: '2020-01-01T00:00:00.000Z' });
  const { native, calls } = nativeStub();
  startReviewPrompts(runtime, native)();
  ruleDaysStore.getState().patch({ days: [1, 2, 3, 4].map((n) => metRow(`2026-01-0${n}`)).concat(metRow(today)) });
  await flush();
  expect(calls).toEqual([]);
  runtime.dispose();
});

test('a manual Rate opens the write-review page, records the tap and ends automatic prompts', async () => {
  const { runtime, today, metRow } = await runtimeWithRule();
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
  ruleDaysStore.getState().patch({ days: [1, 2, 3, 4].map((n) => metRow(`2026-01-0${n}`)).concat(metRow(today)) });
  await flush();
  expect(calls).toEqual(['openWriteReview']);
  stop();
  runtime.dispose();
});
