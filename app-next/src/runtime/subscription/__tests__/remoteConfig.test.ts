import type { AdaptyRemoteConfig } from '../adaptySdk';
import { pickRemoteConfig } from '../remoteConfig';

const config = (lang: string, title: string): AdaptyRemoteConfig => ({ lang, data: { title }, dataString: '' });

test('prefers the exact device locale before the same language', () => {
  const british = config('en-GB', 'British');
  const american = config('en-US', 'American');
  expect(pickRemoteConfig([british, american], 'en-US')?.lang).toBe('en-US');
  expect(pickRemoteConfig([american, british], 'en-US')?.lang).toBe('en-US');
  expect(pickRemoteConfig([british, american], 'en-AU')?.lang).toBe('en-GB');
  expect(pickRemoteConfig([british, american], 'en_US')?.lang).toBe('en-US');
});

test('falls back to the first config when no locale matches', () => {
  const first = config('fr', 'French');
  const second = config('de', 'German');
  expect(pickRemoteConfig([first, second], 'ja-JP')?.lang).toBe('fr');
  expect(pickRemoteConfig([first, second], '')?.lang).toBe('fr');
});

test('no remote configs yields undefined instead of throwing', () => {
  expect(pickRemoteConfig(undefined, 'en-US')).toBeUndefined();
  expect(pickRemoteConfig([], 'en-US')).toBeUndefined();
});
