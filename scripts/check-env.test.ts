/**
 * Tests for the §10.10 doctor (scripts/check-env.ts).
 *
 * Every check is a pure function taking a Ctx (env + injected fetch/fs/exec),
 * so the whole suite runs with mocks — no network, no real keys.
 *
 * Run: npx -y vitest run scripts/check-env.test.ts
 */
import { generateKeyPairSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import {
  type CheckResult,
  type Ctx,
  checkAdapty,
  checkAsc,
  checkClerk,
  checkDependencyManifest,
  checkEas,
  checkPostHog,
  checkResend,
  checkSentry,
  checkServer,
  checkVendorOAuth,
  diffDependencyManifest,
  extractDependencyManifestPackages,
  mergeEnvSources,
  parseEnvFile,
  resolveExitCode,
  runChecks,
} from './check-env'

/** A Ctx where everything explodes unless overridden — proves checks only touch what they need. */
function ctx(overrides: Partial<Ctx> = {}): Ctx {
  return {
    env: {},
    fetch: async () => {
      throw new Error('fetch should not be called')
    },
    readFile: async () => {
      throw new Error('readFile should not be called')
    },
    fileExists: async () => false,
    exec: async () => {
      throw new Error('exec should not be called')
    },
    home: '/home/test',
    projectRoot: '/repo',
    ...overrides,
  }
}

const ok200 = async () => ({ status: 200, ok: true, body: '{}' })
const deny401 = async () => ({ status: 401, ok: false, body: 'unauthorized' })

// A real P-256 key so the ASC check can actually ES256-sign its JWT in tests.
const { privateKey: testP8 } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
const testP8Pem = testP8.export({ type: 'pkcs8', format: 'pem' }).toString()

describe('env loading', () => {
  it('parseEnvFile handles KEY=VALUE, export prefix, quotes, comments, blanks', () => {
    const parsed = parseEnvFile(
      [
        '# comment',
        '',
        'PLAIN=abc',
        'export EXPORTED=def',
        'QUOTED="with spaces"',
        "SINGLE='sq'",
        'EQ_IN_VALUE=a=b=c',
      ].join('\n'),
    )
    expect(parsed).toEqual({
      PLAIN: 'abc',
      EXPORTED: 'def',
      QUOTED: 'with spaces',
      SINGLE: 'sq',
      EQ_IN_VALUE: 'a=b=c',
    })
  })

  it('mergeEnvSources: process.env wins over dotfile values', () => {
    const merged = mergeEnvSources({ A: 'proc', C: 'proc-only' }, { A: 'dot', B: 'dot-only' })
    expect(merged).toEqual({ A: 'proc', B: 'dot-only', C: 'proc-only' })
  })
})

describe('PRD §10.9 dependency manifest', () => {
  const manifest = [
    '### 10.9 Dependency manifest (concrete packages)',
    '',
    '| Concern | Package |',
    '|---|---|',
    '| UI | `alpha-ui` · `@scope/vector-kit` |',
    '| Command example | `npx expo install ignored-command` |',
    '',
    '**Deliberately excluded from v1:**',
    '- `unused-native-package` — no product feature owns it.',
    '',
    '### 10.10 Provisioning',
    '`outside-the-section`',
  ].join('\n')

  it('extracts only package tokens inside §10.9', () => {
    expect(extractDependencyManifestPackages(manifest)).toEqual([
      '@scope/vector-kit',
      'alpha-ui',
      'unused-native-package',
    ])
  })

  it('reports an uninstalled manifest package while honoring only exact reasoned exclusions', () => {
    expect(
      diffDependencyManifest({
        prd: manifest,
        installedPackages: new Set(['alpha-ui']),
        deliberateExclusions: {
          'unused-native-package': 'No product feature owns it in v1.',
        },
      }),
    ).toEqual({
      excluded: [
        {
          packageName: 'unused-native-package',
          reason: 'No product feature owns it in v1.',
        },
      ],
      missing: ['@scope/vector-kit'],
      staleExclusions: [],
    })
  })

  it('does not turn exclusions into a blanket skip and rejects stale entries', () => {
    expect(
      diffDependencyManifest({
        prd: manifest,
        installedPackages: new Set(['alpha-ui', '@scope/vector-kit']),
        deliberateExclusions: {
          'different-package': 'Specific reason, wrong package.',
          'unused-native-package': '',
        },
      }),
    ).toEqual({
      excluded: [],
      missing: ['unused-native-package'],
      staleExclusions: ['different-package'],
    })
  })

  it('makes manifest drift a failing doctor row, not an allow-missing warning', async () => {
    const files: Record<string, string> = {
      '/repo/excerlock-app-prd.md': manifest,
      '/repo/app/package.json': JSON.stringify({ dependencies: { 'alpha-ui': '1.0.0' } }),
      '/repo/server/package.json': JSON.stringify({ dependencies: {} }),
    }
    const result = await checkDependencyManifest(
      ctx({
        readFile: async (path) => files[path] ?? Promise.reject(new Error(`missing ${path}`)),
      }),
      {
        'unused-native-package': 'No product feature owns it in v1.',
      },
    )

    expect(result).toEqual({
      service: 'PRD §10.9 dependencies',
      status: 'failing',
      detail: 'missing @scope/vector-kit',
    })
    expect(resolveExitCode([result], true)).toBe(1)
  })
})

describe('checkClerk', () => {
  it('missing secret key → MISSING, names the var and where it lives', async () => {
    const r = await checkClerk(ctx())
    expect(r.status).toBe('missing')
    expect(r.detail).toContain('CLERK_SECRET_KEY')
  })

  it('key present + 200 → OK', async () => {
    const r = await checkClerk(
      ctx({
        env: { CLERK_SECRET_KEY: 'sk_test_x', EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_x' },
        fetch: ok200,
      }),
    )
    expect(r.status).toBe('ok')
  })

  it('key present + 401 → FAILING with the status code', async () => {
    const r = await checkClerk(
      ctx({
        env: { CLERK_SECRET_KEY: 'sk_test_x', EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_x' },
        fetch: deny401,
      }),
    )
    expect(r.status).toBe('failing')
    expect(r.detail).toContain('401')
  })

  it('network error → FAILING, never throws', async () => {
    const r = await checkClerk(
      ctx({
        env: { CLERK_SECRET_KEY: 'sk_test_x', EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_x' },
        fetch: async () => {
          throw new Error('ECONNREFUSED')
        },
      }),
    )
    expect(r.status).toBe('failing')
    expect(r.detail).toContain('ECONNREFUSED')
  })

  it('secret present but publishable key absent → MISSING, names only the absent var', async () => {
    const r = await checkClerk(ctx({ env: { CLERK_SECRET_KEY: 'sk_test_x' } }))
    expect(r.status).toBe('missing')
    expect(r.detail).toContain('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY')
    expect(r.detail).not.toContain('CLERK_SECRET_KEY,')
  })
})

describe('checkAsc', () => {
  it('no key id / issuer id → MISSING, names both vars', async () => {
    const r = await checkAsc(ctx())
    expect(r.status).toBe('missing')
    expect(r.detail).toContain('ASC_KEY_ID')
    expect(r.detail).toContain('ASC_ISSUER_ID')
  })

  it('ids present but .p8 file absent → MISSING with the expected path', async () => {
    const r = await checkAsc(
      ctx({ env: { ASC_KEY_ID: 'ABC123', ASC_ISSUER_ID: 'iss-1' }, fileExists: async () => false }),
    )
    expect(r.status).toBe('missing')
    expect(r.detail).toContain('/home/test/.excerlock/AuthKey_ABC123.p8')
  })

  it('key file present + 200 → OK (JWT signed with the real key)', async () => {
    let sawAuth = ''
    const r = await checkAsc(
      ctx({
        env: { ASC_KEY_ID: 'ABC123', ASC_ISSUER_ID: 'iss-1' },
        fileExists: async () => true,
        readFile: async () => testP8Pem,
        fetch: async (_url, init) => {
          sawAuth = String((init?.headers as Record<string, string>)?.Authorization ?? '')
          return { status: 200, ok: true, body: '{}' }
        },
      }),
    )
    expect(r.status).toBe('ok')
    expect(sawAuth).toMatch(/^Bearer ey/)
  })

  it('unreadable/garbage .p8 → FAILING, never throws', async () => {
    const r = await checkAsc(
      ctx({
        env: { ASC_KEY_ID: 'ABC123', ASC_ISSUER_ID: 'iss-1' },
        fileExists: async () => true,
        readFile: async () => 'not a pem',
      }),
    )
    expect(r.status).toBe('failing')
  })
})

describe('simple bearer-key services', () => {
  it('checkAdapty: 401 → FAILING; 404 (bogus probe profile) still proves the key → OK', async () => {
    const bad = await checkAdapty(ctx({ env: { ADAPTY_SECRET_KEY: 'k', EXPO_PUBLIC_ADAPTY_KEY: 'p' }, fetch: deny401 }))
    expect(bad.status).toBe('failing')
    const good = await checkAdapty(
      ctx({
        env: { ADAPTY_SECRET_KEY: 'k', EXPO_PUBLIC_ADAPTY_KEY: 'p' },
        fetch: async () => ({ status: 404, ok: false, body: 'no such profile' }),
      }),
    )
    expect(good.status).toBe('ok')
  })

  it('checkPostHog: missing project key → MISSING naming EXPO_PUBLIC_POSTHOG_KEY', async () => {
    const r = await checkPostHog(ctx())
    expect(r.status).toBe('missing')
    expect(r.detail).toContain('EXPO_PUBLIC_POSTHOG_KEY')
  })

  it('checkSentry: token pings, DSNs are presence-checked', async () => {
    const r = await checkSentry(
      ctx({
        env: { SENTRY_AUTH_TOKEN: 't', SENTRY_DSN_MOBILE: 'https://x@o.ingest.sentry.io/1' },
        fetch: ok200,
      }),
    )
    expect(r.status).toBe('missing') // SENTRY_DSN_API absent
    expect(r.detail).toContain('SENTRY_DSN_API')
  })

  it('checkResend: key + 200 → OK', async () => {
    const r = await checkResend(ctx({ env: { RESEND_API_KEY: 're_x' }, fetch: ok200 }))
    expect(r.status).toBe('ok')
  })
})

describe('checkServer', () => {
  it('health 200 → OK', async () => {
    let url = ''
    const r = await checkServer(
      ctx({
        env: { EXCERLOCK_API_URL: 'https://api.example.com' },
        fetch: async (u) => {
          url = u
          return { status: 200, ok: true, body: 'ok' }
        },
      }),
    )
    expect(r.status).toBe('ok')
    expect(url).toBe('https://api.example.com/health')
  })

  it('URL explicitly set but unreachable → FAILING', async () => {
    const r = await checkServer(
      ctx({
        env: { EXCERLOCK_API_URL: 'https://api.example.com' },
        fetch: async () => {
          throw new Error('ECONNREFUSED')
        },
      }),
    )
    expect(r.status).toBe('failing')
  })

  it('URL unset and default unreachable → MISSING (day zero: nothing provisioned yet)', async () => {
    const r = await checkServer(
      ctx({
        fetch: async () => {
          throw new Error('ECONNREFUSED')
        },
      }),
    )
    expect(r.status).toBe('missing')
    expect(r.detail).toContain('EXCERLOCK_API_URL')
  })

  it('no URL set → uses the default api.excerlock.com', async () => {
    let url = ''
    const r = await checkServer(
      ctx({
        fetch: async (u) => {
          url = u
          return { status: 200, ok: true, body: 'ok' }
        },
      }),
    )
    expect(r.status).toBe('ok')
    expect(url).toBe('https://api.excerlock.com/health')
  })
})

describe('checkEas', () => {
  it('eas CLI not installed → MISSING', async () => {
    const r = await checkEas(
      ctx({
        exec: async () => {
          throw Object.assign(new Error('spawn eas ENOENT'), { code: 'ENOENT' })
        },
      }),
    )
    expect(r.status).toBe('missing')
    expect(r.detail).toContain('eas')
  })

  it('whoami exit 0 → OK with the account name', async () => {
    const r = await checkEas(ctx({ exec: async () => ({ code: 0, stdout: 'johansardar\n', stderr: '' }) }))
    expect(r.status).toBe('ok')
    expect(r.detail).toContain('johansardar')
  })

  it('whoami nonzero → FAILING (not logged in)', async () => {
    const r = await checkEas(ctx({ exec: async () => ({ code: 1, stdout: '', stderr: 'Not logged in' }) }))
    expect(r.status).toBe('failing')
  })
})

describe('checkVendorOAuth', () => {
  it('all four id+secret pairs present → OK without any network call', async () => {
    const r = await checkVendorOAuth(
      ctx({
        env: {
          STRAVA_CLIENT_ID: '1',
          STRAVA_CLIENT_SECRET: 's',
          OURA_CLIENT_ID: '2',
          OURA_CLIENT_SECRET: 's',
          WHOOP_CLIENT_ID: '3',
          WHOOP_CLIENT_SECRET: 's',
          POLAR_CLIENT_ID: '4',
          POLAR_CLIENT_SECRET: 's',
        },
      }),
    )
    expect(r.status).toBe('ok')
  })

  it('partial → MISSING listing exactly the absent vars', async () => {
    const r = await checkVendorOAuth(
      ctx({ env: { STRAVA_CLIENT_ID: '1', STRAVA_CLIENT_SECRET: 's', OURA_CLIENT_ID: '2' } }),
    )
    expect(r.status).toBe('missing')
    expect(r.detail).toContain('OURA_CLIENT_SECRET')
    expect(r.detail).toContain('WHOOP_CLIENT_ID')
    expect(r.detail).not.toContain('STRAVA_CLIENT_ID')
  })
})

describe('runChecks (never crash)', () => {
  it('a check that throws becomes a FAILING row, other checks still run', async () => {
    const boom = async (): Promise<CheckResult> => {
      throw new Error('unexpected explosion')
    }
    const fine = async (): Promise<CheckResult> => ({ service: 'Fine', status: 'ok', detail: '' })
    const results = await runChecks(ctx(), [
      { name: 'Boom', run: boom },
      { name: 'Fine', run: fine },
    ])
    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({ service: 'Boom', status: 'failing' })
    expect(results[0].detail).toContain('unexpected explosion')
    expect(results[1].status).toBe('ok')
  })
})

describe('resolveExitCode', () => {
  const okR: CheckResult = { service: 'a', status: 'ok', detail: '' }
  const missingR: CheckResult = { service: 'b', status: 'missing', detail: '' }
  const failingR: CheckResult = { service: 'c', status: 'failing', detail: '' }

  it('all green → 0', () => {
    expect(resolveExitCode([okR, okR], false)).toBe(0)
  })
  it('missing only, no flag → 1', () => {
    expect(resolveExitCode([okR, missingR], false)).toBe(1)
  })
  it('missing only, --allow-missing → 0', () => {
    expect(resolveExitCode([okR, missingR], true)).toBe(0)
  })
  it('any failing → 1 even with --allow-missing', () => {
    expect(resolveExitCode([okR, missingR, failingR], true)).toBe(1)
  })
})
