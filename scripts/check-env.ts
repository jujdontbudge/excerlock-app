#!/usr/bin/env npx tsx
/**
 * ExcerLock day-zero doctor — PRD §10.10 definition-of-done.
 *
 * Verifies every §10.10 service key is present AND live (one cheap
 * authenticated ping each), then prints a per-service ✅/⚠️/❌ table.
 *
 *   ✅ OK       key present, live ping succeeded
 *   ⚠️ MISSING  a key/file is absent — the row says exactly which var/path
 *               and where §10.10 says it lives
 *   ❌ FAILING  key present but the ping failed (bad key, network, server down)
 *
 * Usage:
 *   npx tsx scripts/check-env.ts                 # exit 0 only if all green
 *   npx tsx scripts/check-env.ts --allow-missing # MISSING → warn, exit 0
 *                                                # (FAILING still exits 1)
 *
 * Keyless = degrade gracefully, never crash (PRD law): every check is
 * wrapped — a thrown error becomes a ❌ row, never a stack trace.
 *
 * Dependencies (root wiring belongs to Build 0a — none are committed here):
 *   - runtime: `tsx` (fetched on demand by `npx tsx`), Node ≥ 22 (built-in
 *     fetch + node:crypto ES256 for the ASC JWT). No npm packages required.
 *   - tests:   `vitest` — `npx -y vitest run scripts/check-env.test.ts`
 *   - EAS row: `eas-cli` on PATH (`npm i -g eas-cli`) — its absence is
 *     reported as ⚠️, not an error.
 *
 * Env sources (checked in order; first hit wins):
 *   1. process.env
 *   2. ~/.excerlock/env            — KEY=VALUE lines (# comments, `export `
 *                                    prefix and quotes tolerated)
 *   3. ~/.excerlock/<VAR_NAME>     — one file per var, ALL_CAPS filename,
 *                                    trimmed file contents = value
 *   This is the §10.10 "$HOME dotfile dir" convention: secrets live under
 *   ~/.excerlock/, referenced by path, never committed. docs/credentials.md
 *   lists paths and purposes only — never values.
 *
 * Vars checked (→ where §10.10 lands them):
 *   ASC_KEY_ID, ASC_ISSUER_ID            → EAS config; .p8 at
 *     ASC_KEY_PATH (default ~/.excerlock/AuthKey_<ASC_KEY_ID>.p8)
 *   CLERK_SECRET_KEY                     → server env
 *   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY    → EAS secret
 *   ADAPTY_SECRET_KEY                    → server env
 *   ADAPTY_WEBHOOK_SECRET                → server env + Adapty Authorization
 *   EXPO_PUBLIC_ADAPTY_KEY               → EAS secret
 *   EXPO_PUBLIC_POSTHOG_KEY              → EAS secret (POSTHOG_HOST optional,
 *                                          default https://us.i.posthog.com)
 *   SENTRY_AUTH_TOKEN                    → ~/.sentryclirc + EAS secret
 *   SENTRY_DSN_MOBILE, SENTRY_DSN_API    → app config / server env
 *   EXCERLOCK_API_URL                    → default https://api.excerlock.com
 *   STRAVA/OURA/WHOOP/POLAR _CLIENT_ID + _CLIENT_SECRET → server env only
 *                                          (never the binary; no live ping
 *                                          possible without user tokens)
 */
import { spawn } from 'node:child_process'
import { createPrivateKey, sign as cryptoSign } from 'node:crypto'
import { readFile as fsReadFile, readdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// ---------------------------------------------------------------------------
// Types — every check is a pure function of Ctx so the test suite runs on mocks.
// ---------------------------------------------------------------------------

export type CheckStatus = 'ok' | 'missing' | 'failing'

export interface CheckResult {
  service: string
  status: CheckStatus
  detail: string
}

export interface FetchResponse {
  status: number
  ok: boolean
  body?: string
}

export type Fetcher = (url: string, init?: RequestInit) => Promise<FetchResponse>

export interface Ctx {
  env: Record<string, string | undefined>
  fetch: Fetcher
  readFile: (path: string) => Promise<string>
  fileExists: (path: string) => Promise<boolean>
  exec: (cmd: string, args: string[]) => Promise<{ code: number; stdout: string; stderr: string }>
  home: string
  projectRoot: string
}

export interface Check {
  name: string
  run: (ctx: Ctx) => Promise<CheckResult>
}

// ---------------------------------------------------------------------------
// Env loading — process.env ∪ ~/.excerlock/env ∪ ~/.excerlock/<VAR> files.
// ---------------------------------------------------------------------------

/** Parse KEY=VALUE lines; tolerate comments, blanks, `export ` prefix, quotes. */
export function parseEnvFile(contents: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const unexported = line.startsWith('export ') ? line.slice('export '.length) : line
    const eq = unexported.indexOf('=')
    if (eq <= 0) continue
    const key = unexported.slice(0, eq).trim()
    let value = unexported.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

/** process.env wins over dotfile values. */
export function mergeEnvSources(
  processEnv: Record<string, string | undefined>,
  dotfileEnv: Record<string, string>,
): Record<string, string | undefined> {
  return { ...dotfileEnv, ...processEnv }
}

const ALL_CAPS_NAME = /^[A-Z][A-Z0-9_]*$/

/** Load the ~/.excerlock/ dotfile dir (env file + per-var files). Missing dir = empty. */
async function loadDotfileEnv(home: string): Promise<Record<string, string>> {
  const dir = join(home, '.excerlock')
  const out: Record<string, string> = {}
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return out
  }
  for (const entry of entries) {
    try {
      const full = join(dir, entry)
      if (!(await stat(full)).isFile()) continue
      if (entry === 'env') {
        Object.assign(out, parseEnvFile(await fsReadFile(full, 'utf8')))
      } else if (ALL_CAPS_NAME.test(entry)) {
        out[entry] = (await fsReadFile(full, 'utf8')).trim()
      }
    } catch {
      // unreadable file → skip; the doctor never crashes on env loading
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Check helpers
// ---------------------------------------------------------------------------

/** Names of the given vars that are unset/empty in ctx.env. */
function absentVars(ctx: Ctx, names: string[]): string[] {
  return names.filter((n) => !ctx.env[n])
}

function missing(service: string, absent: string[], where: string): CheckResult {
  return {
    service,
    status: 'missing',
    detail: `missing ${absent.join(', ')} — §10.10: ${where}`,
  }
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

// ---------------------------------------------------------------------------
// PRD §10.9 dependency manifest
// ---------------------------------------------------------------------------

export type DeliberateDependencyExclusions = Readonly<Record<string, string>>

/**
 * Exact v1 exclusions only. Each package stays named in §10.9, so removing a
 * PRD decision makes this entry stale and fails the doctor instead of silently
 * preserving an old skip.
 */
export const DELIBERATE_DEPENDENCY_EXCLUSIONS: DeliberateDependencyExclusions =
  Object.freeze({
    '@expo-google-fonts/*':
      'No Google-font family is selected for v1; expo-font owns bundled font loading.',
    'expo-alternate-app-icons':
      'PRD §8 cuts alternate app icons and the App Icon settings row from v1.',
    'expo-local-authentication':
      'PRD §8 cuts the Face ID app gate from v1; account auth remains Clerk-owned.',
    'expo-mail-composer':
      'Support is the in-app POST /v1/support flow; an OS mail composer would bypass its diagnostics and delivery receipt.',
    'expo-sensors':
      'The v1 cadence feature uses the custom CMMotionActivity/CMPedometer Expo Module; expo-sensors cannot supply live cadence classification.',
  })

const NPM_PACKAGE_TOKEN =
  /^(?:@[a-z0-9][a-z0-9._-]*\/[a-z0-9*][a-z0-9*._-]*|[a-z0-9][a-z0-9._-]*)$/

/** Package-shaped code spans in §10.9, stopping before §10.10. */
export function extractDependencyManifestPackages(prd: string): string[] {
  const start = prd.search(/^### 10\.9\b/m)
  if (start < 0) throw new Error('PRD §10.9 heading not found')
  const afterStart = prd.slice(start)
  const nextHeading = afterStart.slice(1).search(/^### 10\.10\b/m)
  if (nextHeading < 0) throw new Error('PRD §10.10 heading not found after §10.9')
  const section = afterStart.slice(0, nextHeading + 1)
  const packages = new Set<string>()

  for (const match of section.matchAll(/`([^`\n]+)`/g)) {
    const token = match[1]?.trim()
    if (token !== undefined && NPM_PACKAGE_TOKEN.test(token)) {
      packages.add(token)
    }
  }
  return [...packages].sort()
}

type DependencyManifestDiff = Readonly<{
  excluded: readonly Readonly<{ packageName: string; reason: string }>[]
  missing: readonly string[]
  staleExclusions: readonly string[]
}>

export function diffDependencyManifest({
  prd,
  installedPackages,
  deliberateExclusions,
}: Readonly<{
  prd: string
  installedPackages: ReadonlySet<string>
  deliberateExclusions: DeliberateDependencyExclusions
}>): DependencyManifestDiff {
  const declared = extractDependencyManifestPackages(prd)
  const declaredSet = new Set(declared)
  const excluded: { packageName: string; reason: string }[] = []
  const missing: string[] = []

  for (const packageName of declared) {
    if (installedPackages.has(packageName)) continue
    const reason = deliberateExclusions[packageName]?.trim()
    if (reason) excluded.push({ packageName, reason })
    else missing.push(packageName)
  }

  return {
    excluded,
    missing,
    staleExclusions: Object.keys(deliberateExclusions)
      .filter((packageName) => !declaredSet.has(packageName))
      .sort(),
  }
}

function packageNames(packageJson: string): string[] {
  const parsed = JSON.parse(packageJson) as Record<string, unknown>
  return ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']
    .flatMap((field) => {
      const value = parsed[field]
      return typeof value === 'object' && value !== null ? Object.keys(value) : []
    })
}

/** Local, deterministic repo-integrity check — credential flags never demote it. */
export async function checkDependencyManifest(
  ctx: Ctx,
  deliberateExclusions: DeliberateDependencyExclusions = DELIBERATE_DEPENDENCY_EXCLUSIONS,
): Promise<CheckResult> {
  const service = 'PRD §10.9 dependencies'
  try {
    const [prd, appPackageJson, serverPackageJson] = await Promise.all([
      ctx.readFile(join(ctx.projectRoot, 'excerlock-app-prd.md')),
      ctx.readFile(join(ctx.projectRoot, 'app', 'package.json')),
      ctx.readFile(join(ctx.projectRoot, 'server', 'package.json')),
    ])
    const installedPackages = new Set([
      ...packageNames(appPackageJson),
      ...packageNames(serverPackageJson),
    ])
    const declaredCount = extractDependencyManifestPackages(prd).length
    const diff = diffDependencyManifest({
      prd,
      installedPackages,
      deliberateExclusions,
    })
    const problems = [
      ...(diff.missing.length === 0 ? [] : [`missing ${diff.missing.join(', ')}`]),
      ...(diff.staleExclusions.length === 0
        ? []
        : [`stale exclusions ${diff.staleExclusions.join(', ')}`]),
    ]
    return problems.length > 0
      ? { service, status: 'failing', detail: problems.join(' · ') }
      : {
          service,
          status: 'ok',
          detail: `${declaredCount} declared · ${diff.excluded.length} reasoned v1 exclusions`,
        }
  } catch (e) {
    return {
      service,
      status: 'failing',
      detail: `could not diff §10.9 against package manifests: ${errMessage(e)}`,
    }
  }
}

/** Run a ping; 2xx → ok, anything else → failing. Never throws. */
async function ping(
  service: string,
  ctx: Ctx,
  url: string,
  init: RequestInit,
  okDetail: string,
): Promise<CheckResult> {
  try {
    const res = await ctx.fetch(url, init)
    if (res.ok) return { service, status: 'ok', detail: okDetail }
    return {
      service,
      status: 'failing',
      detail: `key present but ping failed: HTTP ${res.status} from ${url}${
        res.body ? ` — ${res.body.slice(0, 120)}` : ''
      }`,
    }
  } catch (e) {
    return { service, status: 'failing', detail: `key present but ping failed: ${errMessage(e)}` }
  }
}

// ---------------------------------------------------------------------------
// The §10.10 checks — one per service row.
// ---------------------------------------------------------------------------

/** Apple / App Store Connect: ASC API key ids + .p8 file, then a signed-JWT ping. */
export async function checkAsc(ctx: Ctx): Promise<CheckResult> {
  const service = 'Apple / App Store Connect'
  const absent = absentVars(ctx, ['ASC_KEY_ID', 'ASC_ISSUER_ID'])
  if (absent.length) return missing(service, absent, 'team/app ids → EAS config, key ids in env/dotfiles')
  const keyPath =
    ctx.env.ASC_KEY_PATH ?? join(ctx.home, '.excerlock', `AuthKey_${ctx.env.ASC_KEY_ID}.p8`)
  if (!(await ctx.fileExists(keyPath))) {
    return {
      service,
      status: 'missing',
      detail: `missing .p8 key file at ${keyPath} — §10.10: ASC API key (.p8) → ~/ dotfile dir (override with ASC_KEY_PATH)`,
    }
  }
  try {
    const pem = await ctx.readFile(keyPath)
    const jwt = signAscJwt(pem, ctx.env.ASC_KEY_ID!, ctx.env.ASC_ISSUER_ID!)
    return await ping(
      service,
      ctx,
      'https://api.appstoreconnect.apple.com/v1/apps?limit=1',
      { headers: { Authorization: `Bearer ${jwt}` } },
      'ASC API ping ok',
    )
  } catch (e) {
    return { service, status: 'failing', detail: `could not sign ASC JWT: ${errMessage(e)}` }
  }
}

/** ES256 JWT for the App Store Connect API (Node crypto only, no deps). */
function signAscJwt(p8Pem: string, keyId: string, issuerId: string): string {
  const b64url = (input: string | Buffer): string =>
    Buffer.from(input).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }))
  const payload = b64url(
    JSON.stringify({ iss: issuerId, iat: now, exp: now + 300, aud: 'appstoreconnect-v1' }),
  )
  const signingInput = `${header}.${payload}`
  const key = createPrivateKey(p8Pem)
  const signature = cryptoSign('sha256', Buffer.from(signingInput), {
    key,
    dsaEncoding: 'ieee-p1363',
  })
  return `${signingInput}.${signature.toString('base64url')}`
}

/** Clerk: secret key (server env) + publishable key (EAS secret), Backend API ping. */
export async function checkClerk(ctx: Ctx): Promise<CheckResult> {
  const service = 'Clerk'
  const absent = absentVars(ctx, ['CLERK_SECRET_KEY', 'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY'])
  if (absent.length) {
    return missing(service, absent, 'publishable key → EXPO_PUBLIC_* EAS secret, secret key → server env')
  }
  return ping(
    service,
    ctx,
    'https://api.clerk.com/v1/users?limit=1',
    { headers: { Authorization: `Bearer ${ctx.env.CLERK_SECRET_KEY}` } },
    'Backend API ping ok',
  )
}

/**
 * Adapty: server key ping against the server-side API using a probe profile id.
 * A 404 (profile not found) still proves the key authenticates; only
 * 401/403 (or transport errors) mean the key is bad.
 */
export async function checkAdapty(ctx: Ctx): Promise<CheckResult> {
  const service = 'Adapty'
  const absent = absentVars(ctx, [
    'ADAPTY_SECRET_KEY',
    'ADAPTY_WEBHOOK_SECRET',
    'EXPO_PUBLIC_ADAPTY_KEY',
  ])
  if (absent.length) {
    return missing(
      service,
      absent,
      'public SDK key → EAS secret; API and webhook secrets → server env',
    )
  }
  const url = 'https://api.adapty.io/api/v2/server-side-api/profile/'
  try {
    const res = await ctx.fetch(url, {
      headers: {
        Authorization: `Api-Key ${ctx.env.ADAPTY_SECRET_KEY}`,
        'adapty-profile-id': '00000000-0000-0000-0000-000000000000',
      },
    })
    if (res.status === 401 || res.status === 403) {
      return {
        service,
        status: 'failing',
        detail: `key present but rejected: HTTP ${res.status} from ${url}`,
      }
    }
    return { service, status: 'ok', detail: 'server-side API key authenticates' }
  } catch (e) {
    return { service, status: 'failing', detail: `key present but ping failed: ${errMessage(e)}` }
  }
}

/** PostHog: project key ping via the decide endpoint (no personal key needed). */
export async function checkPostHog(ctx: Ctx): Promise<CheckResult> {
  const service = 'PostHog'
  const absent = absentVars(ctx, ['EXPO_PUBLIC_POSTHOG_KEY'])
  if (absent.length) {
    return missing(service, absent, 'project API key → EXPO_PUBLIC_POSTHOG_KEY (EAS secret)')
  }
  const host = ctx.env.POSTHOG_HOST ?? 'https://us.i.posthog.com'
  return ping(
    service,
    ctx,
    `${host}/decide/?v=3`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: ctx.env.EXPO_PUBLIC_POSTHOG_KEY, distinct_id: 'check-env-doctor' }),
    },
    'project key accepted by /decide',
  )
}

/** Sentry: auth token pings the API root; both project DSNs are presence-checked. */
export async function checkSentry(ctx: Ctx): Promise<CheckResult> {
  const service = 'Sentry'
  const absent = absentVars(ctx, ['SENTRY_AUTH_TOKEN', 'SENTRY_DSN_MOBILE', 'SENTRY_DSN_API'])
  if (absent.length) {
    return missing(
      service,
      absent,
      'DSNs (excerlock-mobile / excerlock-api) → app config + server env, auth token → ~/.sentryclirc + EAS secret',
    )
  }
  return ping(
    service,
    ctx,
    'https://sentry.io/api/0/',
    { headers: { Authorization: `Bearer ${ctx.env.SENTRY_AUTH_TOKEN}` } },
    'auth token ok; both DSNs present',
  )
}

/**
 * Server / Azure: GET /v1/health on the API base URL (default api.excerlock.com).
 * The path carries the /v1 prefix `server/src/index.ts` registers healthRoutes under —
 * a bare /health is a 404 and reads as "server down" when the server is fine.
 * An explicitly set EXCERLOCK_API_URL that doesn't answer is ❌ (server down);
 * an unset URL whose default doesn't answer is ⚠️ (day zero: not provisioned yet).
 */
export async function checkServer(ctx: Ctx): Promise<CheckResult> {
  const service = 'Server / Azure'
  const configured = ctx.env.EXCERLOCK_API_URL
  const base = (configured ?? 'https://api.excerlock.com').replace(/\/$/, '')
  const url = `${base}/v1/health`
  try {
    const res = await ctx.fetch(url, {})
    if (res.ok) return { service, status: 'ok', detail: `${url} reachable` }
    if (configured) {
      return { service, status: 'failing', detail: `${url} answered HTTP ${res.status}` }
    }
  } catch (e) {
    if (configured) {
      return { service, status: 'failing', detail: `${url} unreachable: ${errMessage(e)}` }
    }
  }
  return {
    service,
    status: 'missing',
    detail: `EXCERLOCK_API_URL not set and default ${url} not answering — §10.10: VPS + DNS via az CLI, server secrets → systemd EnvironmentFile`,
  }
}

/** Expo / EAS: `eas whoami` — CLI missing → ⚠️, not logged in → ❌. */
export async function checkEas(ctx: Ctx): Promise<CheckResult> {
  const service = 'Expo / EAS'
  try {
    const res = await ctx.exec('eas', ['whoami', '--non-interactive'])
    if (res.code === 0) {
      return { service, status: 'ok', detail: `logged in as ${res.stdout.trim() || '(unknown)'}` }
    }
    return {
      service,
      status: 'failing',
      detail: `eas whoami exited ${res.code} — run \`eas login\` or set EXPO_TOKEN (${res.stderr.trim().slice(0, 120)})`,
    }
  } catch (e) {
    return {
      service,
      status: 'missing',
      detail: `eas CLI not on PATH (\`npm i -g eas-cli\`) — §10.10: eas CLI + Expo MCP`,
    }
  }
}

const VENDOR_VARS = [
  'STRAVA_CLIENT_ID',
  'STRAVA_CLIENT_SECRET',
  'OURA_CLIENT_ID',
  'OURA_CLIENT_SECRET',
  'WHOOP_CLIENT_ID',
  'WHOOP_CLIENT_SECRET',
  'POLAR_CLIENT_ID',
  'POLAR_CLIENT_SECRET',
]

/** Vendor OAuth apps: presence only — no live ping is possible without user tokens. */
export async function checkVendorOAuth(ctx: Ctx): Promise<CheckResult> {
  const service = 'Vendor OAuth apps'
  const absent = absentVars(ctx, VENDOR_VARS)
  if (absent.length) {
    return missing(service, absent, 'client ids/secrets → server env only (never the binary)')
  }
  return {
    service,
    status: 'ok',
    detail: 'all 4 vendor id+secret pairs present (no ping without user tokens)',
  }
}

// ---------------------------------------------------------------------------
// Runner + reporting
// ---------------------------------------------------------------------------

export const ALL_CHECKS: Check[] = [
  { name: 'PRD §10.9 dependencies', run: checkDependencyManifest },
  { name: 'Apple / App Store Connect', run: checkAsc },
  { name: 'Clerk', run: checkClerk },
  { name: 'Adapty', run: checkAdapty },
  { name: 'PostHog', run: checkPostHog },
  { name: 'Sentry', run: checkSentry },
  { name: 'Server / Azure', run: checkServer },
  { name: 'Expo / EAS', run: checkEas },
  // 'Vendor OAuth apps' is deliberately absent. Strava/Oura/Whoop/Polar were
  // all cut from v1 (2026-08-01), so absent client ids are the intended state,
  // not a gap — reporting them as MISSING would leave the doctor permanently
  // yellow and train everyone to ignore it. `checkVendorOAuth` stays exported
  // and tested; a later vendor effort re-adds this one line.
]

/** Run all checks; a thrown error becomes a ❌ row — the doctor never crashes. */
export async function runChecks(ctx: Ctx, checks: Check[]): Promise<CheckResult[]> {
  return Promise.all(
    checks.map(async (check) => {
      try {
        return await check.run(ctx)
      } catch (e) {
        return { service: check.name, status: 'failing' as const, detail: errMessage(e) }
      }
    }),
  )
}

/** Exit 1 on any ❌; ⚠️ exits 1 too unless --allow-missing. */
export function resolveExitCode(results: CheckResult[], allowMissing: boolean): 0 | 1 {
  if (results.some((r) => r.status === 'failing')) return 1
  if (!allowMissing && results.some((r) => r.status === 'missing')) return 1
  return 0
}

// Emoji code-unit lengths differ (✅=1, ⚠️=2), so pad the text part only —
// every emoji renders two cells wide, keeping columns visually aligned.
const STATUS_LABEL: Record<CheckStatus, { emoji: string; text: string }> = {
  ok: { emoji: '✅', text: 'OK' },
  missing: { emoji: '⚠️', text: 'MISSING' },
  failing: { emoji: '❌', text: 'FAILING' },
}
const STATUS_TEXT_WIDTH = Math.max(...Object.values(STATUS_LABEL).map((s) => s.text.length))

function statusCell(status: CheckStatus): string {
  const { emoji, text } = STATUS_LABEL[status]
  return `${emoji} ${text.padEnd(STATUS_TEXT_WIDTH)}`
}

export function renderTable(results: CheckResult[]): string {
  const serviceWidth = Math.max(...results.map((r) => r.service.length), 'Service'.length)
  const statusWidth = STATUS_TEXT_WIDTH + 3 // two display cells for the emoji + space
  const lines = [
    `${'Service'.padEnd(serviceWidth)}  ${'Status'.padEnd(statusWidth)}  Detail`,
    `${'-'.repeat(serviceWidth)}  ${'-'.repeat(statusWidth)}  ${'-'.repeat(6)}`,
  ]
  for (const r of results) {
    lines.push(`${r.service.padEnd(serviceWidth)}  ${statusCell(r.status)}  ${r.detail}`)
  }
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// main — real Ctx wiring (only runs when invoked directly, not under vitest)
// ---------------------------------------------------------------------------

function realFetch(url: string, init?: RequestInit): Promise<FetchResponse> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(10_000) }).then(async (res) => ({
    status: res.status,
    ok: res.ok,
    body: await res.text().catch(() => undefined),
  }))
}

function realExec(cmd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => (stdout += d))
    child.stderr.on('data', (d) => (stderr += d))
    child.on('error', reject) // e.g. ENOENT — the check maps this to ⚠️
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }))
  })
}

async function main(): Promise<void> {
  const allowMissing = process.argv.includes('--allow-missing')
  const home = homedir()
  const ctx: Ctx = {
    env: mergeEnvSources(process.env, await loadDotfileEnv(home)),
    fetch: realFetch,
    readFile: (p) => fsReadFile(p, 'utf8'),
    fileExists: (p) =>
      stat(p).then(
        (s) => s.isFile(),
        () => false,
      ),
    exec: realExec,
    home,
    projectRoot: fileURLToPath(new URL('..', import.meta.url)),
  }

  console.log('ExcerLock day-zero doctor (PRD §10.10)\n')
  const results = await runChecks(ctx, ALL_CHECKS)
  console.log(renderTable(results))

  const counts = {
    ok: results.filter((r) => r.status === 'ok').length,
    missing: results.filter((r) => r.status === 'missing').length,
    failing: results.filter((r) => r.status === 'failing').length,
  }
  console.log(`\n${counts.ok} ok · ${counts.missing} missing · ${counts.failing} failing`)
  if (counts.missing && allowMissing) {
    console.log('(--allow-missing: treating ⚠️ as warnings)')
  }
  process.exitCode = resolveExitCode(results, allowMissing)
}

const isDirectRun =
  typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href
if (isDirectRun) {
  // Last-resort guard: the doctor reports, it never stack-traces.
  main().catch((e) => {
    console.error(`doctor crashed unexpectedly: ${errMessage(e)}`)
    process.exitCode = 1
  })
}
