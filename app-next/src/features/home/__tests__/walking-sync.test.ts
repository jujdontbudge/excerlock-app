import { createRuntime } from '../../../runtime/createRuntime';
import { startWalkingSync } from '../walkingSync';
test('legacy Home walking sync does not start a second policy engine', async () => {
  const runtime = createRuntime(); await runtime.dev.load('home-locked-walking');
  const start = jest.spyOn(runtime.walking, 'start'); const stop = startWalkingSync(runtime);
  runtime.dev.setMotion('walking'); runtime.dev.advance(10_000);
  expect(start).not.toHaveBeenCalled(); stop(); runtime.dispose();
});
