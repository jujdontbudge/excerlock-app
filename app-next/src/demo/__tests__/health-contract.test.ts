import { healthContract } from '../../ports/__tests__/healthContract';
import { createRuntime } from '../../runtime/createRuntime';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { startProgressSync } from '../../features/home/progressSync';

healthContract('fake', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('manual-entry-day');
  const stop = startProgressSync(runtime);
  return {
    port: runtime.health,
    progress: () => ruleDaysStore.getState().data.days.find((row) => row.ruleId === 'run')?.progress ?? 0,
    flush: async () => {
      await Promise.resolve();
      await Promise.resolve();
    },
    dispose: () => {
      stop();
      runtime.dispose();
    },
  };
});
