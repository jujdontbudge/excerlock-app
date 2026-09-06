import { renderRouter } from 'expo-router/testing-library';
import { previews } from '../__previews__/registry';
import { assertAccessible } from '../../testing/assertAccessible';
test.each(previews.flatMap((p) => p.variants.map((v) => [p.name + ' ' + v.label, v.element] as const)))(
  '%s exposes named native controls',
  async (_, element) => {
    const router = renderRouter({ index: () => element });
    const rendered = await router;
    assertAccessible(rendered.toJSON());
    await rendered.unmount();
  },
);
