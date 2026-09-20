import fs from 'node:fs';
import path from 'node:path';
import { preBranch, tail } from '../../../onboarding/flow';
import { setupSteps } from '../../../onboarding/setupFlow';
import { semanticScreenName, scrubAnalyticsProps } from '../PostHogAnalyticsAdapter';
import { createAnalyticsFixture, flushAdapter } from './analyticsFixture';

/**
 * B4 screen-coverage guardrail: every production route under `app/` must map to
 * a semantic `$screen`, so adding a screen without a mapping fails CI instead
 * of silently dropping the event.
 */
const appDir = path.resolve(__dirname, '../../../../app');

/** Launch gates (`app/index.tsx`), non-production routes and layouts are not screens. */
const notScreens = new Set(['index', 'dev', 'linked-trace', '_layout']);
/** Harness-only routes (`RootNavigator` closes them in a prod build); never a `$screen`. */
const notScreenDirectories = new Set(['diagnostics']);

const onboardingSteps = [...preBranch, ...tail.filter((step) => step !== 'P'), 'W0', 'W1', 'W2', 'W3', 'G0F', 'G0H', 'G1', 'G2'];

function routeFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(target);
    return entry.name.endsWith('.tsx') ? [target] : [];
  });
}

/** `(tabs)/home.tsx` → `/home`; `settings/legal/index.tsx` → `/settings/legal`. */
function routeSegments(file: string): string[] {
  const segments = path
    .relative(appDir, file)
    .replace(/\.tsx$/, '')
    .split('/')
    .filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')));
  if (segments.at(-1) === 'index') segments.pop();
  return segments;
}

/** Values a dynamic segment can actually take, from the app's own vocabulary. */
function valuesFor(segments: string[], param: string): string[] {
  if (param === 'step') return segments[0] === 'setup' ? [...setupSteps] : onboardingSteps;
  if (param === 'doc') return ['terms', 'privacy'];
  if (param === 'name') return ['screenTime', 'motion', 'location', 'camera', 'notifications'];
  throw new Error(`Add a production value for the new dynamic route segment [${param}]`);
}

function concreteRoutes(): string[] {
  return routeFiles(appDir).flatMap((file) => {
    // Only the root `index` is a launch gate; `settings/legal/index.tsx` is a real screen.
    const name = path.basename(file, '.tsx');
    if (name === '_layout' || (path.dirname(file) === appDir && notScreens.has(name))) return [];
    const segments = routeSegments(file);
    if (notScreenDirectories.has(segments[0])) return [];
    if (!segments.some((segment) => segment.startsWith('['))) return [`/${segments.join('/')}`];
    return segments.reduce<string[]>(
      (routes, segment) =>
        routes.flatMap((route) =>
          segment.startsWith('[')
            ? valuesFor(segments, segment.slice(1, -1)).map((value) => `${route}/${value}`)
            : [`${route}/${segment}`],
        ),
      [''],
    );
  });
}

test('every production route maps to a semantic screen with scrubber-safe properties', () => {
  const routes = concreteRoutes();
  expect(routes).toContain('/home');
  expect(routes).toContain('/settings/account');
  expect(routes).toContain('/onboarding/O01');
  expect(routes).toContain('/setup/X4');
  const unmapped = routes.filter((route) => semanticScreenName(route) === null);
  expect(unmapped).toEqual([]);
  const malformed = routes.flatMap((route) => {
    const screen = semanticScreenName(route)!;
    const violations: string[] = [];
    if (!/^[a-z][a-z0-9_]*$/.test(screen.name)) violations.push(`${route} → ${screen.name}`);
    // The emitted qualifiers must survive the transport boundary untouched.
    if (JSON.stringify(scrubAnalyticsProps(screen.props)) !== JSON.stringify(screen.props ?? {})) violations.push(`${route} props are scrubbed`);
    return violations;
  });
  expect(malformed).toEqual([]);
});

test('non-production routes never emit a screen event', () => {
  expect(['/', '/dev', '/linked-trace'].filter((route) => semanticScreenName(route) !== null)).toEqual([]);
});

test('the paywall step id and a settings route both reach the transport', async () => {
  const x = createAnalyticsFixture();
  await x.adapter.identify('uid');
  x.adapter.screen('P');
  x.adapter.screen('/settings/account');
  await flushAdapter();
  expect(x.screens).toEqual([{ name: 'paywall', props: undefined }, { name: 'settings_account', props: undefined }]);
});
