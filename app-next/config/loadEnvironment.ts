import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseEnvFile, resolveClientEnvironment, type EnvironmentValues } from './environment';

/** Never touch the developer's credential file in tests or on hosted builds. */
export function loadBuildEnvironment(processValues: EnvironmentValues = process.env, readLocal: () => string = () => readFileSync(join(homedir(), '.excerlock', 'env'), 'utf8')): Record<string, string | undefined> {
  if (processValues.NODE_ENV === 'test') return {};
  let local: EnvironmentValues = {};
  if (!processValues.CI && processValues.EAS_BUILD !== 'true') {
    try { local = parseEnvFile(readLocal()); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('Unable to read optional ExcerLock environment file');
    }
  }
  return {
    ...resolveClientEnvironment(processValues, local),
    SENTRY_AUTH_TOKEN: processValues.SENTRY_AUTH_TOKEN ?? local.SENTRY_AUTH_TOKEN,
  };
}
