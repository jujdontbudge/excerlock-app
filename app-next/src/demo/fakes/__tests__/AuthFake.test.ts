import { createRuntime } from '../../../runtime/createRuntime';
import { describeAuthPort } from '../../../ports/__tests__/authContract';

describeAuthPort(async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  return { port: runtime.auth, code: '123456', dispose: runtime.dispose };
});
