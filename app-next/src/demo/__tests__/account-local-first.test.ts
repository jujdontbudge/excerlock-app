import { createRuntime } from '../../runtime/createRuntime';
import { rulesStore } from '../../state/rulesStore';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { settingsStore } from '../../state/settingsStore';
test('deleting an account leaves rules, progress, locked apps and settings on device', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  await runtime.auth.signInWithApple();
  const rules = rulesStore.getState().data,
    days = ruleDaysStore.getState().data,
    settings = settingsStore.getState().data;
  await runtime.auth.deleteAccount();
  expect(runtime.auth.session()).toMatchObject({ kind: 'anonymous', userId: expect.any(String) });
  expect(rulesStore.getState().data).toEqual(rules);
  expect(ruleDaysStore.getState().data).toEqual(days);
  expect(settingsStore.getState().data).toEqual(settings);
});
