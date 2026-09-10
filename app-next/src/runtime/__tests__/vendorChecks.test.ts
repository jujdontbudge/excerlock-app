import { checkVendors } from '../../../config/vendorChecks';
const env = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://auth.example.com', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'public-test',
  EXPO_PUBLIC_API_URL: 'https://api.example.com', EXPO_PUBLIC_POSTHOG_HOST: 'https://analytics.example.com',
  EXPO_PUBLIC_POSTHOG_KEY: 'public-test', SENTRY_AUTH_TOKEN: 'upload-test', SENTRY_DSN: 'https://test@example.com/1',
  ADAPTY_SECRET_KEY: 'server-test', EXPO_PUBLIC_ADAPTY_KEY: 'public-test', EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'client-test',
};
test('never contacts a vendor with absent credentials', async () => {
  const probe = jest.fn();
  expect((await checkVendors({}, probe)).every((row) => row.status === 'missing')).toBe(true);
  expect(probe).not.toHaveBeenCalled();
});
test('auth failure and server failure never count as successful Adapty authentication', async () => {
  for (const status of [401, 403, 429, 500, 503]) {
    expect((await checkVendors(env, async () => ({ status }))).find((row) => row.service === 'Adapty')?.status).toBe('failing');
  }
  expect((await checkVendors(env, async () => ({ status: 404 }))).find((row) => row.service === 'Adapty')?.status).toBe('ok');
});
test('withholds response errors containing credentials and continues other probes', async () => {
  const result = await checkVendors(env, async (url) => {
    if (url.includes('sentry')) throw new Error('upload-test');
    return { status: 200 };
  });
  expect(result).toHaveLength(6);
  expect(result.find((row) => row.service === 'Sentry')?.status).toBe('failing');
  expect(JSON.stringify(result)).not.toContain('upload-test');
});
test('uses the API v1 health path and never sends server keys to other vendors', async () => {
  const probe = jest.fn(async () => ({ status: 200 }));
  await checkVendors(env, probe);
  expect(probe).toHaveBeenCalledWith('https://api.example.com/v1/health', undefined);
  for (const call of probe.mock.calls as unknown as [string, RequestInit | undefined][]) {
    if (!call[0].includes('adapty.io')) expect(JSON.stringify(call)).not.toContain('server-test');
  }
});
