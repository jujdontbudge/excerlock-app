import { diagnosticsRoutesEnabled } from '../diagnosticsRoutes';

test('the sensor smoke route opens in development and preview builds only; prod and lab never route it', () => {
  expect(diagnosticsRoutesEnabled('dev', true)).toBe(true);
  expect(diagnosticsRoutesEnabled(undefined, true)).toBe(true);
  expect(diagnosticsRoutesEnabled('preview', false)).toBe(true);
  expect(diagnosticsRoutesEnabled('prod', false)).toBe(false);
  expect(diagnosticsRoutesEnabled('prod', true)).toBe(false);
  expect(diagnosticsRoutesEnabled('lab', false)).toBe(false);
  expect(diagnosticsRoutesEnabled('anything-else', false)).toBe(false);
});
