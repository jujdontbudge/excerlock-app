import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import plist from '@expo/plist';
import { parse as parseYaml } from 'yaml';

import { fromRoot, readJson, readUtf8, repoRoot } from './repo-files';

type Eas = { build?: Record<string, unknown> };
type ExpoConfig = { expo?: { ios?: { bundleIdentifier?: string } } };
type LinkIdentity = {
  URL_SCHEME: string;
  WALKING_RECORDER_SCHEME: string;
  WALKING_RECORDER_LINK_HOSTS: { linkedSession: string; shareArchive: string };
};
type ResearchConfig = LinkIdentity & {
  RUNTIME_VERSION: string;
  WALKING_RECORDER_BUNDLE_ID: string;
  PRODUCTION_COMPARISON_BUNDLE_ID: string;
  production: { appGroup: string; bundleIds: { app: string } };
  research: { appGroup: string; bundleIds: { app: string } };
};

const app = (...parts: string[]) => fromRoot('app-next', ...parts);
// The lab link contract has exactly one owner: this CommonJS module, which both
// the Expo config plugin and the research bundle import. The guardrail executes
// it instead of re-reading its source text.
const linkIdentity = createRequire(import.meta.url)(app('plugins', 'linkedRecorderLinks.js')) as LinkIdentity;
// The research config owner is the single source for the lab identity, the
// production comparison identity, the recorder identity and the runtime version.
// Reading it here lets this guardrail compare the committed manifests and the
// generated recorder project against the values the build actually uses.
const config = createRequire(import.meta.url)(app('plugins', 'linkedRecorderResearchConfig.js')) as ResearchConfig;
if (!config) throw new Error('the research config owner must be loadable');

describe('linked recorder research boundary', () => {
  it('keeps the committed production manifest and EAS profiles free of a research delivery profile', () => {
    const config = readJson<ExpoConfig>(app('app.json'));
    const eas = readJson<Eas>(app('eas.json'));
    expect(config.expo?.ios?.bundleIdentifier).toBe('com.johansardar.excerlock');
    expect(Object.keys(eas.build ?? {})).not.toContain('linked-recorder');
  });

  it('executes the real Expo loader in production, research, and refused delivery modes', () => {
    const result = spawnSync(process.execPath, ['--test', 'scripts/test-config-smoke.cjs'], {
      cwd: app(),
      encoding: 'utf8',
      timeout: 180_000,
      env: { ...process.env },
    });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
  }, 200_000);

  it('executes all target factories, the Metro resolver, and the standalone artifact rules', () => {
    const result = spawnSync(process.execPath, [
      '--test',
      'scripts/linked-recorder-config.test.cjs',
      'scripts/metro.test.cjs',
      'scripts/standalone-research.test.cjs',
      'scripts/production-install-record.test.cjs',
    ], {
      cwd: app(),
      encoding: 'utf8',
      timeout: 180_000,
      env: { ...process.env },
    });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
  }, 200_000);

  it('executes the lab-mode route suite with the research flag actually compiled in', () => {
    // The lab route-access contract only proves anything when Babel inlines
    // `__LINKED_RECORDER_TRACE__` as true, exactly as the standalone artifact
    // compiles it. `--no-cache` prevents a cached ordinary transform from
    // passing the suite without the lab branch.
    const result = spawnSync(
      process.execPath,
      [
        fromRoot('node_modules', 'jest', 'bin', 'jest.js'),
        '--config',
        'jest.config.js',
        '--runInBand',
        '--no-cache',
        '--testMatch',
        '**/src/features/launch/__tests__/*.research.tsx',
      ],
      {
        cwd: app(),
        encoding: 'utf8',
        timeout: 180_000,
        env: { ...process.env, EXCERLOCK_LINKED_RECORDER_TRACE: '1', EXCERLOCK_ENV: 'lab' },
      },
    );
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
  }, 200_000);

  it('executes the offline joiner evidence-contract suite', () => {
    // The joiner is the contract the recorder archive and the ExcerLock trace
    // must still satisfy offline; running its unittest fixtures here keeps an
    // evidence-format regression from surviving to a manual device run.
    const result = spawnSync('python3', ['-m', 'unittest', 'tools/linked-recorder/test_join.py'], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 180_000,
      env: { ...process.env },
    });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
  }, 200_000);

  it('keeps one lab-only link contract across the Trace Lab config, the recorder plist, and the recorder project', () => {
    // Executable owner of the identity.
    expect(linkIdentity.WALKING_RECORDER_SCHEME).toBe('excerlock-walkingrecorder');
    expect(linkIdentity.URL_SCHEME).toBe('excerlock-linked-trace');
    expect(linkIdentity.WALKING_RECORDER_LINK_HOSTS).toEqual({ linkedSession: 'linked-session', shareArchive: 'share-archive' });

    // The recorder registers only that scheme, parsed as a plist rather than by
    // substring. The recorder's executable LinkedLinkTests prove the matching URL
    // builders/parsers; the Trace Lab config factories and artifact verifier own
    // the lab-only Trace Lab scheme.
    const info = plist.parse(readUtf8(fromRoot('tools', 'phone-walking-recorder', 'Support', 'Info.plist'))) as {
      CFBundleURLTypes?: { CFBundleURLSchemes?: string[] }[];
    };
    const schemes = (info.CFBundleURLTypes ?? []).flatMap((type) => type.CFBundleURLSchemes ?? []);
    expect(schemes).toEqual([linkIdentity.WALKING_RECORDER_SCHEME]);

    // The XcodeGen project pins the lab bundle identifier the recorder must own.
    const project = parseYaml(readUtf8(fromRoot('tools', 'phone-walking-recorder', 'project.yml'))) as {
      targets?: Record<string, { settings?: { base?: Record<string, unknown> } }>;
    };
    expect(project.targets?.PhoneWalkingRecorder?.settings?.base?.PRODUCT_BUNDLE_IDENTIFIER)
      .toBe(config.WALKING_RECORDER_BUNDLE_ID);
  });

  it('keeps the lab, production-comparison, recorder and runtime identities in the one config owner', () => {
    // The artifact verifier, the production install-record comparator and the
    // phone proof all resolve these through the owner instead of re-typing them,
    // so these independent expectations pin what that owner must say.
    expect(config.research.bundleIds.app).toBe('com.johansardar.excerlock.lab.linkedtrace');
    expect(config.research.appGroup).toBe('group.com.johansardar.excerlock.lab.linkedtrace');
    expect(config.production.bundleIds.app).toBe('com.johansardar.excerlock');
    expect(config.PRODUCTION_COMPARISON_BUNDLE_ID).toBe(config.production.bundleIds.app);
    expect(config.WALKING_RECORDER_BUNDLE_ID).toBe('com.johansardar.excerlock.lab.walkingrecorder');
    expect(config.WALKING_RECORDER_BUNDLE_ID).toContain('.lab.');
    expect(config.WALKING_RECORDER_BUNDLE_ID).not.toBe(config.research.bundleIds.app);
    expect(config.RUNTIME_VERSION).toBe('2-linked-recorder-1');
    expect(config.URL_SCHEME).toBe(linkIdentity.URL_SCHEME);
    expect(config.research.appGroup).not.toBe(config.production.appGroup);
  });

  it('executes the ordinary-artifact scanner against clean and contaminated fixtures', () => {
    const root = mkdtempSync(join(tmpdir(), 'linked-recorder-boundary-'));
    try {
      const clean = join(root, 'clean.bin');
      writeFileSync(clean, Buffer.from([0x00, 0x01, 0x02, 0x03]));
      const scanner = app('scripts', 'verify-no-linked-trace.cjs');
      const cleanResult = spawnSync(process.execPath, [scanner, clean], { encoding: 'utf8' });
      expect(cleanResult.status, cleanResult.stderr).toBe(0);
      // Every research-only Swift body the ordinary pod must not compile is a
      // scanner marker, so an artifact that carries one fails the shipping scan.
      for (const marker of ['LinkedTraceWriter', 'LinkedTraceLifecyclePolicy']) {
        const contaminated = join(root, `contaminated-${marker}.bin`);
        writeFileSync(contaminated, Buffer.from(`ordinary-prefix\0${marker}\0ordinary-suffix`));
        const contaminatedResult = spawnSync(process.execPath, [scanner, contaminated], { encoding: 'utf8' });
        expect(contaminatedResult.status, `${marker}: ${contaminatedResult.stderr}`).toBe(1);
        expect(contaminatedResult.stderr).toContain('Linked Recorder research marker(s) found');
        expect(contaminatedResult.stderr).toContain(marker);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
