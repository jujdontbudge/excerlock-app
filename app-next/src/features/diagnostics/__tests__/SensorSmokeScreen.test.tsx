import { render, screen, userEvent, act } from '@testing-library/react-native';
import { SensorSmokeScreen } from '../SensorSmokeScreen';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { sensorSmokeCopy as c } from '../../../content/diagnostics';
import { EVERYTHING_AVAILABLE, EVERYTHING_UNAVAILABLE, FakeSensorStreamModule } from '../../../runtime/detection/testing/FakeSensorStreamModule';
import type { Runtime } from '../../../runtime/Runtime';

const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

async function renderSmoke(sensors?: Runtime['sensors']) {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  (runtime as Runtime).sensors = sensors;
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <SensorSmokeScreen sampleWindowMs={0} />
    </AppRuntimeProvider>,
  );
  await settle();
  return runtime;
}

test('on a phone without sensors every stream reads unavailable, rejected with the unavailable code, stopped — and the verdict is honest', async () => {
  const native = new FakeSensorStreamModule(EVERYTHING_UNAVAILABLE);
  await renderSmoke(native);
  expect(screen.getByRole('header', { name: c.title })).toBeTruthy();
  expect(screen.getByText(c.honest(5))).toBeTruthy();
  for (const title of Object.values(c.streamTitle)) expect(screen.getByText(title)).toBeTruthy();
  expect(screen.getAllByText(`${c.unavailable} · ${c.rejected('ERR_MOTION_UNAVAILABLE')} · ${c.stopped}`)).toHaveLength(5);
  expect(screen.getByText(`${c.unavailable} · ${c.rejected('ERR_MOTION_UNAVAILABLE')}`)).toBeTruthy();
  expect(screen.getByText('authorized')).toBeTruthy();
  // Availability flags are listed one per row, as the binary reported them.
  expect(screen.getAllByText(c.no).length).toBe(11);
  expect(native.running.size).toBe(0);
});

test('an available stream shows started, its sample count and stopped; Run again repeats the smoke', async () => {
  const native = new FakeSensorStreamModule(EVERYTHING_AVAILABLE, 'authorized', 2);
  await renderSmoke(native);
  expect(screen.getByText(c.honest(5))).toBeTruthy();
  expect(screen.getAllByText(`${c.available} · ${c.started} · ${c.samples(2)} · ${c.stopped}`)).toHaveLength(5);
  expect(screen.getByText(`${c.available} · ${c.recorded}`)).toBeTruthy();
  const starts = native.calls.filter((call) => call.startsWith('start:')).length;
  // The run counter is how an observer tells a second identical verdict from the first.
  expect(screen.getByText(c.runs)).toBeTruthy();
  expect(screen.getByText('1')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: c.runAgain }));
  await settle();
  expect(native.calls.filter((call) => call.startsWith('start:')).length).toBe(starts * 2);
  expect(screen.getByText('2')).toBeTruthy();
  expect(screen.queryByText('1')).toBeNull();
});

test('a lying flag is called out as a mismatch', async () => {
  const native = new FakeSensorStreamModule(EVERYTHING_UNAVAILABLE);
  native.startAltimeter = async () => { native.running.add('altimeter'); };
  await renderSmoke(native);
  expect(screen.getByText(c.mismatches(1))).toBeTruthy();
});

test('the fake runtime has no native surface and says so instead of pretending', async () => {
  await renderSmoke(undefined);
  expect(screen.getByText(c.noNative)).toBeTruthy();
  expect(screen.queryByText(c.running)).toBeNull();
});
