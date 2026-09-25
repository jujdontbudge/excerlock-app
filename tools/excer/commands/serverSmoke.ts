import { spawn, type ChildProcess } from 'node:child_process';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { serverRoot } from '../lib/paths.ts';
import { must, option, out, run, sleep } from '../lib/shell.ts';

export const serverSmokeHelp = `excer server smoke [--keep] [--root <server dir>]

Builds the server and runs it against a throwaway Postgres 16 container on
127.0.0.1:55432 with stubbed Adapty, PostHog and Supabase admin endpoints.
It walks one account through the real HTTP API: auth refusal, provisioning,
a support request, an incident report, deletion, and the tombstone, and asserts
every row the account owned is gone. The server runs in an empty directory
with a minimal environment, so no local .env or real key is ever loaded.
Needs Docker. --keep leaves the container running for inspection. --root smokes
another checkout's server directory (for example main before a deploy).`;

const container = 'excer-smoke-postgres';
const databasePort = 55432;
const databaseUrl = `postgresql://postgres:smoke@127.0.0.1:${databasePort}/excerlock`;

type StubCall = { method: string; path: string };

async function listen(server: Server): Promise<number> {
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  return (server.address() as AddressInfo).port;
}

function startVendorStub(calls: StubCall[]): Server {
  return createServer((request, response) => {
    calls.push({ method: request.method ?? '', path: request.url ?? '' });
    request.resume();
    request.on('end', () => {
      response.setHeader('content-type', 'application/json');
      response.end(request.url?.includes('/persons/bulk_delete/') ? '{"deletion_errors":[]}' : '{}');
    });
  });
}

function mintToken(secret: string, issuer: string, userId: string): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: userId, aud: 'authenticated', iss: issuer, role: 'authenticated', iat: now, exp: now + 600 })}`;
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}

function sql(query: string): string {
  return must('docker', ['exec', container, 'psql', '-U', 'postgres', '-d', 'excerlock', '-tAc', query]).trim();
}

async function startDatabase(): Promise<void> {
  run('docker', ['rm', '-f', container]);
  must('docker', ['run', '-d', '--name', container, '-e', 'POSTGRES_PASSWORD=smoke', '-e', 'POSTGRES_DB=excerlock', '-p', `127.0.0.1:${databasePort}:5432`, 'postgres:16-alpine']);
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (run('docker', ['exec', container, 'pg_isready', '-U', 'postgres', '-d', 'excerlock', '-h', '127.0.0.1']).code === 0) return;
    await sleep(500);
  }
  throw new Error('Postgres did not become ready');
}

async function waitForHealth(base: string, server: ChildProcess): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`server exited with ${server.exitCode}`);
    try {
      if ((await fetch(`${base}/v1/health`)).ok) return;
    } catch {}
    await sleep(250);
  }
  throw new Error('server did not answer /v1/health');
}

export async function serverSmokeCommand(args: string[]): Promise<number> {
  const keep = args.includes('--keep');
  const root = resolve(option(args, 'root') ?? serverRoot);
  const calls: StubCall[] = [];
  const stub = startVendorStub(calls);
  let server: ChildProcess | undefined;
  let failures = 0;
  const expect = (ok: boolean, line: string, detail?: string) => {
    (ok ? out.ok : out.fail)(line);
    if (!ok) {
      failures += 1;
      if (detail) out.detail(detail);
    }
  };
  try {
    const stubUrl = `http://127.0.0.1:${await listen(stub)}`;
    must('npm', ['run', '-s', 'build'], { cwd: root });
    await startDatabase();
    out.ok(`postgres:16-alpine on 127.0.0.1:${databasePort}`);
    const secret = randomBytes(32).toString('hex');
    const probe = createServer();
    const apiPort = await listen(probe);
    await new Promise((done) => probe.close(done));
    const environment = {
      PATH: process.env.PATH ?? '',
      HOME: tmpdir(),
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      PORT: String(apiPort),
      DATABASE_URL: databaseUrl,
      SUPABASE_URL: stubUrl,
      SUPABASE_JWT_SECRET: secret,
      SUPABASE_SERVICE_ROLE_KEY: 'smoke-service-role',
      ADAPTY_SECRET_KEY: 'smoke-adapty',
      ADAPTY_API_URL: stubUrl,
      ADAPTY_WEBHOOK_SECRET: 'smoke-webhook',
      POSTHOG_PERSONAL_API_KEY: 'smoke-posthog',
      POSTHOG_PROJECT_ID: '1',
      POSTHOG_API_HOST: stubUrl,
      DELETION_WORKER_ENABLED: 'false',
      RESEND_API_KEY: '',
      POSTHOG_API_KEY: '',
      SENTRY_DSN: '',
      CLERK_SECRET_KEY: '',
      CLERK_ISSUER: '',
    };
    const cwd = mkdtempSync(join(tmpdir(), 'excer-smoke-'));
    must('node', [join(root, 'dist', 'migrate.js')], { cwd, env: environment });
    out.ok('migrations applied');
    server = spawn('node', [join(root, 'dist', 'index.js')], { cwd, env: environment, stdio: 'ignore' });
    const base = `http://127.0.0.1:${apiPort}`;
    await waitForHealth(base, server);

    const call = async (method: string, path: string, token?: string, body?: object, authorization?: string) => {
      const response = await fetch(`${base}${path}`, {
        method,
        headers: {
          ...(token ? { authorization: `Bearer ${token}` } : authorization ? { authorization } : {}),
          ...(body ? { 'content-type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: response.status, text: await response.text() };
    };

    const health = await call('GET', '/v1/health');
    expect(health.status === 200, `GET /v1/health → ${health.status}`, health.text);
    const ready = await call('GET', '/v1/ready');
    expect(ready.status === 200, `GET /v1/ready → ${ready.status}`, ready.text);

    const userId = randomUUID();
    const token = mintToken(secret, `${stubUrl}/auth/v1`, userId);
    const anonymous = await call('PUT', '/v1/user');
    expect(anonymous.status === 401, `PUT /v1/user without a token → ${anonymous.status}`, anonymous.text);
    const forged = await call('PUT', '/v1/user', mintToken('wrong-secret', `${stubUrl}/auth/v1`, userId));
    expect(forged.status === 401, `PUT /v1/user with a forged token → ${forged.status}`, forged.text);

    const provision = await call('PUT', '/v1/user', token);
    expect(provision.status === 204, `PUT /v1/user → ${provision.status}`, provision.text);
    const again = await call('PUT', '/v1/user', token);
    expect(again.status === 204, `PUT /v1/user again (idempotent) → ${again.status}`, again.text);

    const support = await call('POST', '/v1/support', token, { category: 'feature', title: 'Smoke widget', message: 'Smoke feature request.' });
    expect(support.status === 201, `POST /v1/support → ${support.status}`, support.text);
    const incident = await call('POST', '/v1/incident-reports', token, {
      whatWentWrong: 'Smoke: apps stayed locked.',
      shouldHaveHappened: 'Smoke: they should have opened.',
      app: { version: '1.0.0', build: '1', osVersion: '26.0' },
      reportedAt: new Date().toISOString(),
      diagnostics: { lock: { state: 'shield' } },
    });
    expect(incident.status === 201, `POST /v1/incident-reports → ${incident.status}`, incident.text);
    const leaky = await call('POST', '/v1/incident-reports', token, {
      whatWentWrong: 'Smoke', shouldHaveHappened: 'Smoke', app: { version: '1.0.0', build: '1' },
      reportedAt: new Date().toISOString(), diagnostics: { latitude: 51.5 },
    });
    expect(leaky.status === 400, `POST /v1/incident-reports with a location key → ${leaky.status}`, leaky.text);

    const owned = (table: string) => Number(sql(`select count(*) from ${table} where user_id = '${userId}'`));
    const premium = {
      customer_user_id: userId,
      event_type: 'access_level_updated',
      event_datetime: new Date().toISOString(),
      event_properties: { profile_event_id: randomUUID(), access_level_id: 'premium', environment: 'Production', is_active: true, is_in_grace_period: false },
    };
    const unsigned = await call('POST', '/v1/webhooks/adapty', undefined, premium, 'wrong');
    expect(unsigned.status === 401, `POST /v1/webhooks/adapty with the wrong secret → ${unsigned.status}`, unsigned.text);
    const webhook = await call('POST', '/v1/webhooks/adapty', undefined, premium, 'smoke-webhook');
    expect(webhook.status === 200 && webhook.text.includes('"recorded":true'), `POST /v1/webhooks/adapty → ${webhook.status} ${webhook.text}`);
    const replay = await call('POST', '/v1/webhooks/adapty', undefined, premium, 'smoke-webhook');
    const deliveries = Number(sql(`select count(*) from adapty_webhook_events where user_id = '${userId}'`));
    expect(replay.status === 200 && deliveries === 1, `a replayed Adapty delivery is recorded once (${deliveries})`, replay.text);
    const mirrored = sql(`select environment || '|' || has_access from adapty_subscription_states where user_id = '${userId}'`);
    expect(mirrored === 'production|true', `premium access mirrored (${mirrored || 'no row'})`);
    const at = (offsetMs: number, active: boolean) => ({
      ...premium,
      event_datetime: new Date(Date.now() + offsetMs).toISOString(),
      event_properties: { ...premium.event_properties, profile_event_id: randomUUID(), is_active: active },
    });
    await call('POST', '/v1/webhooks/adapty', undefined, at(60_000, false), 'smoke-webhook');
    const stale = await call('POST', '/v1/webhooks/adapty', undefined, at(-60_000, true), 'smoke-webhook');
    const ordered = sql(`select has_access::text from adapty_subscription_states where user_id = '${userId}' and environment = 'production'`);
    expect(stale.status === 200 && ordered === 'false', `a newer expiry wins over a late older renewal (has_access ${ordered})`, stale.text);
    expect(owned('incident_reports') === 1 && owned('support_requests') === 1, 'the account owns 1 incident report and 1 support request');

    const deletion = await call('DELETE', '/v1/user', token);
    expect(deletion.status === 204, `DELETE /v1/user → ${deletion.status}`, deletion.text);
    const erased = (fragment: string) => calls.some((entry) => entry.path.includes(fragment));
    expect(erased('/api/v2/server-side-api/profile/') && erased('/persons/bulk_delete/') && erased(`/auth/v1/admin/users/${userId}`), 'Adapty, PostHog and Supabase erasure were called', JSON.stringify(calls));
    for (const table of ['incident_reports', 'support_requests', 'feature_request_votes', 'adapty_subscription_states', 'vendor_connections']) {
      const count = owned(table);
      expect(count === 0, `${table} rows left for the account: ${count}`);
    }
    const features = Number(sql(`select count(*) from feature_requests where title = 'Smoke widget'`));
    expect(features === 0, `feature_requests rows left from the account's submission: ${features}`);
    const unlinked = Number(sql(`select count(*) from adapty_webhook_events where user_id is null`));
    expect(unlinked === 3, `the Adapty delivery ledger survives, unlinked from the account (${unlinked})`);
    const tombstone = sql(`select coalesce(email, '<null>') || '|' || (deleted_at is not null) from users where id = '${userId}'`);
    expect(tombstone === '<null>|true', `users row is a tombstone (email|deleted: ${tombstone})`);
    const revived = await call('PUT', '/v1/user', token);
    expect(revived.status === 410, `PUT /v1/user after deletion → ${revived.status}`, revived.text);
  } catch (error) {
    failures += 1;
    out.fail(error instanceof Error ? error.message : String(error));
  } finally {
    server?.kill('SIGTERM');
    stub.close();
    if (keep) out.info(`kept ${container} (docker rm -f ${container})`);
    else run('docker', ['rm', '-f', container]);
  }
  console.log(failures === 0 ? '\nserver smoke passed' : `\n${failures} server smoke assertion(s) failed`);
  return failures === 0 ? 0 : 1;
}
