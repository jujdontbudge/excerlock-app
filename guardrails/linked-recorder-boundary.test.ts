import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import plist from '@expo/plist';
import { parse as parseYaml } from 'yaml';

import { fromRoot, readJson, readUtf8 } from './repo-files';

type Eas = { build?: Record<string, unknown> };
type ExpoConfig = { expo?: { ios?: { bundleIdentifier?: string } } };
type LinkIdentity = {
  URL_SCHEME: string;
  WALKING_RECORDER_SCHEME: string;
  WALKING_RECORDER_LINK_HOSTS: { linkedSession: string; shareArchive: string };
};

const app = (...parts: string[]) => fromRoot('app-next', ...parts);
// The lab link contract has exactly one owner: this CommonJS module, which both
// the Expo config plugin and the research bundle import. The guardrail executes
// it instead of re-reading its source text.
const linkIdentity = createRequire(import.meta.url)(app('plugins', 'linkedRecorderLinks.js')) as LinkIdentity;

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
    ], {
      cwd: app(),
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
      .toBe('com.johansardar.excerlock.lab.walkingrecorder');
  });

  it('executes the ordinary-artifact scanner against clean and contaminated fixtures', () => {
    const root = mkdtempSync(join(tmpdir(), 'linked-recorder-boundary-'));
    try {
      const clean = join(root, 'clean.bin');
      const contaminated = join(root, 'contaminated.bin');
      writeFileSync(clean, Buffer.from([0x00, 0x01, 0x02, 0x03]));
      writeFileSync(contaminated, Buffer.from('ordinary-prefix\0LinkedTraceWriter\0ordinary-suffix'));
      const scanner = app('scripts', 'verify-no-linked-trace.cjs');
      const cleanResult = spawnSync(process.execPath, [scanner, clean], { encoding: 'utf8' });
      const contaminatedResult = spawnSync(process.execPath, [scanner, contaminated], { encoding: 'utf8' });
      expect(cleanResult.status, cleanResult.stderr).toBe(0);
      expect(contaminatedResult.status).toBe(1);
      expect(contaminatedResult.stderr).toContain('Linked Recorder research marker(s) found');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
