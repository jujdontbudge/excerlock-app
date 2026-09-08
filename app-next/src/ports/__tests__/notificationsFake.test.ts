import { createRuntime } from '../../runtime/createRuntime';
import { describeNotificationsPort } from './notificationsContract';

describeNotificationsPort(async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  runtime.dev.setPromptMode('grant');
  return { port: runtime.notifications, dispose: runtime.dispose };
});
