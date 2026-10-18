#!/usr/bin/env node
// Read-only SDK profile confirmation, using the endpoint in Adapty iOS 4.0.2 source.
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const [profile, destination] = process.argv.slice(2);
if (!/^[a-f0-9-]{36}$/i.test(profile || '') || !destination) process.exit(2);
const env = dotenv.parse(fs.readFileSync(path.join(__dirname, '../../app-next/.env.local')));
const key = env.EXPO_PUBLIC_ADAPTY_KEY;
if (!key) throw new Error('Missing local SDK credential');
(async () => {
  const response = await fetch(`https://api.adapty.io/api/v1/sdk/analytics/profiles/${profile}/`, {
    method: 'GET', headers: {
      Authorization: `Api-Key ${key}`, 'adapty-sdk-profile-id': profile,
      'adapty-sdk-platform': 'iOS', 'adapty-sdk-version': '4.0.2', 'adapty-sdk-store': 'app_store',
    }, signal: AbortSignal.timeout(30000),
  });
  const body = await response.text();
  fs.writeFileSync(destination + '-private.json', body, { mode: 0o600 });
  let parsed;
  try { parsed = JSON.parse(body); } catch { parsed = {}; }
  const data = parsed.data?.attributes ?? parsed.data ?? parsed;
  const result = { fetched_utc: new Date().toISOString(), method: 'GET', status: response.status, requested_profile_id: profile,
    evidence: 'Adapty SDK profile endpoint response; not dashboard Event Feed or ad-platform receipt' };
  for (const name of ['profile_id', 'customer_user_id', 'subscriptions', 'paid_access_levels', 'timestamp', 'is_test_user']) {
    if (data[name] !== undefined) result[name] = data[name];
  }
  fs.writeFileSync(destination + '-summary.json', JSON.stringify(result, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ status: response.status, summary: destination + '-summary.json' }));
  if (!response.ok) process.exitCode = 1;
})().catch(() => { console.error('Profile fetch unavailable; no credential or response body logged'); process.exitCode = 1; });
