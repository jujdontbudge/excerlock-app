import { act } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { createRuntime } from '../../../runtime/createRuntime';
import { appRoutes } from '../../../testing/screenRegistry';
import { clipAudit, typeDigest, withFontScale, XL_FONT_SCALE } from '../../../testing/dynamicType';

test('the builder summary survives XL text: nothing fixed-height holds text and every label scales', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  await withFontScale(XL_FONT_SCALE, async () => {
    const rendered = await renderRouter(appRoutes(runtime), { initialUrl: '/builder?id=walk' });
    await act(async () => undefined);
    expect(screen.getByText('Walk 5,000 steps')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save condition' })).toBeTruthy();
    const tree = rendered.toJSON();
    expect(clipAudit(tree)).toEqual([]);
    const digest = typeDigest(tree);
    expect(digest.every((item) => item.scales)).toBe(true);
    expect(digest).toMatchSnapshot();
    await rendered.unmount();
  });
  runtime.dispose();
});
