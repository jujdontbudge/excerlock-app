import { act } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { createRuntime } from '../../../runtime/createRuntime';
import { appRoutes } from '../../../testing/screenRegistry';
import { clipAudit, typeDigest, withFontScale, XL_FONT_SCALE } from '../../../testing/dynamicType';

test.each(['home-locked-walking', 'home-two-conditions-locked', 'home-unlocked-met'])(
  'Home survives XL text in %s: nothing fixed-height holds text and every label scales',
  async (scenario) => {
    const runtime = createRuntime();
    await runtime.dev.load(scenario);
    await withFontScale(XL_FONT_SCALE, async () => {
      const rendered = await renderRouter(appRoutes(runtime), { initialUrl: '/home' });
      await act(async () => undefined);
      expect(screen.getByRole('header', { name: /Alex/ })).toBeTruthy();
      const tree = rendered.toJSON();
      expect(clipAudit(tree)).toEqual([]);
      const digest = typeDigest(tree);
      expect(digest.every((item) => item.scales)).toBe(true);
      if (scenario === 'home-locked-walking') expect(digest).toMatchSnapshot();
      await rendered.unmount();
    });
    runtime.dispose();
  },
);
