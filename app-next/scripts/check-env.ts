#!/usr/bin/env -S npx tsx
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { buildClientExtra, parseEnvFile } from '../config/environment';
import { loadBuildEnvironment } from '../config/loadEnvironment';
import { checkVendors } from '../config/vendorChecks';

async function main() {
  const values = loadBuildEnvironment();
  buildClientExtra(values, 'prod', { requireUploadToken: true });
  let local: Record<string, string> = {};
  if (!process.env.CI && process.env.EAS_BUILD !== 'true' && process.env.NODE_ENV !== 'test') {
    try { local = parseEnvFile(readFileSync(join(homedir(), '.excerlock', 'env'), 'utf8')); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('Unable to read doctor environment'); }
  }
  const result = await checkVendors({ ...values, ADAPTY_SECRET_KEY: process.env.ADAPTY_SECRET_KEY ?? local.ADAPTY_SECRET_KEY }, (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(10_000), redirect: 'error' }));
  console.log(JSON.stringify({ checks: result, scope: 'service probes only; no device activation evidence' }, null, 2));
  if (result.some((check) => check.status !== 'ok')) process.exitCode = 1;
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Environment check failed'); process.exitCode = 1; });
