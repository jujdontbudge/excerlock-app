import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir, userInfo, hostname } from 'node:os';
import { join } from 'node:path';
import { repoRoot, serverRoot } from '../lib/paths.ts';
import { flag, option, out, run, UsageError } from '../lib/shell.ts';

export const accessHelp = `excer access grant <email> --note <note> [--until YYYY-MM-DD] [--environment production|sandbox] [--prod]
excer access revoke <email> --note <note> [--environment production|sandbox] [--prod]
excer access list [email] [--environment production|sandbox] [--prod]

Default: local database from EXCER_ACCESS_DATABASE_URL, Production authorization lane.
--prod operates on the production VM database and REQUIRES the owner's explicit
approval in this conversation for grant/revoke. Sandbox grants on that VM also
change production data. Nothing calls Adapty or sends email.
Date-only expiry means 00:00:00 UTC at the START of that day. Omit --until for
indefinite access. Emails are trimmed and lowercased; dots and plus tags remain.
List includes recipient emails: keep its output private. See docs/agents/access.md.`;

export function accessCommand(args: string[]): number {
  const prod = flag(args, 'prod');
  const note = option(args, 'note');
  const untilInput = option(args, 'until');
  const environment = option(args, 'environment') ?? 'production';
  const [action, email, ...extra] = args;
  if (!['grant', 'revoke', 'list'].includes(action ?? '') || !['production', 'sandbox'].includes(environment) || extra.length || (email?.startsWith('--'))) throw new UsageError(accessHelp);
  if (action !== 'list' && (!email || !note?.trim())) throw new UsageError('Grant and revoke require email and --note');
  if (action !== 'grant' && untilInput) throw new UsageError('--until is only valid for grant');
  if (action === 'list' && note) throw new UsageError('--note is not valid for list');
  let until: string | undefined;
  if (untilInput) {
    const value = /^\d{4}-\d{2}-\d{2}$/.test(untilInput) ? `${untilInput}T00:00:00.000Z` : untilInput;
    const parsed = new Date(value);
    const day = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(parsed.getTime()) || !Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== value.slice(0, 10) || parsed <= new Date()) throw new UsageError('--until must be a future UTC date or ISO timestamp with timezone');
    until = parsed.toISOString();
  }
  let actor = `${userInfo().username}@${hostname()}`;
  if (prod) {
    const auth = run('gcloud', ['auth', 'list', '--filter=status:ACTIVE', '--format=value(account)']);
    if (auth.code || !auth.stdout.trim()) throw new UsageError('gcloud has no active account; see docs/agents/services.md');
    actor = auth.stdout.trim();
  }
  const input = JSON.stringify({ action, email, note, until, environment, actor });
  let result;
  if (prod) {
    out.info(`${action === 'list' ? 'Reading' : 'Changing'} PRODUCTION DATABASE (${environment} authorization lane)`);
    const command = 'sudo systemd-run --quiet --pipe --wait --collect --property=User=excerlock --property=WorkingDirectory=/opt/excerlock/server --property=EnvironmentFile=/etc/excerlock/env /usr/bin/node /opt/excerlock/server/dist/packages/subscriptions/accessCommand.js';
    result = run('gcloud', ['compute', 'ssh', 'excerlock-api', '--project=174877771548', '--zone=us-central1-a', '--quiet', '--ssh-flag=-T', '--command', command], { input });
  } else {
    const databaseUrl = process.env.EXCER_ACCESS_DATABASE_URL;
    if (!databaseUrl) throw new UsageError('Set EXCER_ACCESS_DATABASE_URL to your isolated local Postgres database');
    let host: string;
    try { host = new URL(databaseUrl).hostname; } catch { throw new UsageError('Invalid EXCER_ACCESS_DATABASE_URL'); }
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(host)) throw new UsageError('Local access commands require a loopback database; production requires --prod');
    const cwd = mkdtempSync(join(tmpdir(), 'excer-access-'));
    try {
      result = run(process.execPath, [join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs'), join(serverRoot, 'src', 'packages', 'subscriptions', 'accessCommand.ts')], {
        cwd, input,
        env: { PATH: process.env.PATH, EXCER_SIM: process.env.EXCER_SIM, EXCER_METRO_PORT: process.env.EXCER_METRO_PORT, DATABASE_URL: databaseUrl, NODE_ENV: 'test' },
      });
    } finally { rmSync(cwd, { recursive: true, force: true }); }
  }
  if (result.code) { out.fail('Access command failed; check configuration, database and migration'); return 1; }
  const payload = JSON.parse(result.stdout.trim());
  if (action === 'list') console.log(JSON.stringify(payload, null, 2));
  else out.ok(JSON.stringify(payload));
  return 0;
}
