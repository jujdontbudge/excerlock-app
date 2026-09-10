#!/usr/bin/env -S npx tsx
/** Upload only this app's allowlisted variables. Never forward the whole vendor dotfile. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { buildClientExtra, CLIENT_ENV_NAMES } from '../config/environment';
import { loadBuildEnvironment } from '../config/loadEnvironment';

const args = process.argv.slice(2);
const environment = args.find((arg) => !arg.startsWith('--'));
if (!environment || !['development', 'preview', 'production'].includes(environment) || args.some((arg) => arg.startsWith('--') && arg !== '--dry-run')) {
  throw new Error('Usage: npx tsx scripts/eas-secrets.ts development|preview|production [--dry-run]');
}
const values = { ...loadBuildEnvironment(), EXCERLOCK_ENV: ({ development: 'dev', preview: 'preview', production: 'prod' } as Record<string, string>)[environment] } as Record<string, string | undefined>;
// All remote environments should have complete credentials, including development.
buildClientExtra(values, 'prod', { requireUploadToken: true });
const cwd = resolve(fileURLToPath(new URL('..', import.meta.url)));
for (const name of [...CLIENT_ENV_NAMES, 'SENTRY_AUTH_TOKEN', 'EXCERLOCK_ENV']) {
  const visibility = name === 'SENTRY_AUTH_TOKEN' ? 'secret' : name === 'EXCERLOCK_ENV' ? 'plaintext' : 'sensitive';
  if (args.includes('--dry-run')) {
    console.log(`${environment}: ${name} (${visibility})`);
    continue;
  }
  // Current EAS uses env:set; secret:push is deprecated. No shell interpolation, no output with values.
  const result = spawnSync('eas', ['env:set', environment, '--name', name, '--value', values[name]!, '--visibility', visibility, '--scope', 'project', '--non-interactive'], {
    cwd, encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, EAS_BUILD_PROFILE: environment, EXCERLOCK_ENV: values.EXCERLOCK_ENV },
  });
  if (result.error || result.status !== 0) throw new Error(`EAS environment upload failed for ${name}; values and CLI output withheld`);
  console.log(`${environment}: ${name} uploaded (${visibility})`);
}
