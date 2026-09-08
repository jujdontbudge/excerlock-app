import { legalCopy } from '../legal';

/**
 * Release guardrail (P2-T10 step 7): the app must not ship with placeholder legal text. A production
 * build (EAS profile `production`, or `EXPO_PUBLIC_RELEASE_BUILD=1` in CI) fails this test until Johan
 * supplies the real Terms and Privacy documents and the placeholder marker is cleared.
 */
const productionBuild = process.env.EAS_BUILD_PROFILE === 'production' || process.env.EXPO_PUBLIC_RELEASE_BUILD === '1';

test('the legal placeholder marker is declared explicitly', () => {
  expect(typeof legalCopy.placeholder).toBe('boolean');
});

(productionBuild ? test : test.skip)('a production build carries no placeholder legal text', () => {
  expect(legalCopy.placeholder).toBe(false);
});
