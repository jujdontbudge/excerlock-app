import { act } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { createRuntime } from '../../runtime/createRuntime';
import { appRoutes, screens } from '../screenRegistry';
import { clipAudit, withFontScale, XL_FONT_SCALE } from '../dynamicType';

test.each(screens.map((s) => [s.name, s] as const))('%s has no text that cannot grow at XL', async (_, entry) => {
  const runtime = createRuntime();
  await runtime.dev.load(entry.scenario);
  await entry.prepare?.(runtime);
  await withFontScale(XL_FONT_SCALE, async () => {
    const rendered = await renderRouter(appRoutes(runtime), { initialUrl: entry.url });
    await act(async () => undefined);
    expect(clipAudit(rendered.toJSON())).toEqual([]);
    await rendered.unmount();
  });
  runtime.dispose();
});
