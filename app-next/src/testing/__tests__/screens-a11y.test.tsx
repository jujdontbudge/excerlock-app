import { readdirSync } from 'fs';
import { join, relative } from 'path';
import { act } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { createRuntime } from '../../runtime/createRuntime';
import { assertAccessible } from '../assertAccessible';
import { appRoutes, screens } from '../screenRegistry';

const appDir = join(__dirname, '..', '..', '..', 'app');
const notScreens = new Set(['index', 'dev', '_layout', 'settings/_layout', '(tabs)/_layout']);
function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return routeFiles(path);
    if (!entry.name.endsWith('.tsx')) return [];
    return [relative(appDir, path).replace(/\.tsx$/, '')];
  });
}
const matches = (route: string, url: string) => {
  const path = url.split('?')[0].replace(/^\//, '');
  const pattern = '^' + route.replace(/\(tabs\)\//, '').replace(/\[[^\]]+\]/g, '[^/]+') + '$';
  return new RegExp(pattern).test(path);
};

test('every route file under app/ has at least one registry entry', () => {
  const missing = routeFiles(appDir)
    .filter((route) => !notScreens.has(route))
    .filter((route) => !screens.some((s) => matches(route, s.url)));
  expect(missing).toEqual([]);
});

test.each(screens.map((s) => [s.name, s] as const))(
  '%s exposes named, focusable controls to VoiceOver',
  async (_, entry) => {
    const runtime = createRuntime();
    await runtime.dev.load(entry.scenario);
    await entry.prepare?.(runtime);
    const router = renderRouter(appRoutes(runtime), { initialUrl: entry.url });
    const rendered = await router;
    await act(async () => undefined);
    expect(router.getPathname()).toBe(entry.landsOn ?? entry.url.split('?')[0]);
    assertAccessible(rendered.toJSON());
    await rendered.unmount();
    runtime.dispose();
  },
);
