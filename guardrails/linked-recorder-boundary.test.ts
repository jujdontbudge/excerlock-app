import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { fromRoot, readJson, readUtf8 } from './repo-files';

type Eas = { build?: Record<string, unknown> };
type ExpoConfig = { expo?: { ios?: { bundleIdentifier?: string } } };

const app = (...parts: string[]) => fromRoot('app-next', ...parts);

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
  }, 30_000);

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
  }, 30_000);

  it('keeps one lab-only link contract across the Trace Lab config, the recorder, and the preflight', () => {
    // The guided path has exactly one owner of each lab identifier: the Expo
    // config plugin for the JS side, the recorder's plist/Swift for its own
    // links, and the native preflight for the recorder bundle it must refuse.
    const config = readUtf8(app('plugins', 'linkedRecorderResearchConfig.js'));
    const recorderScheme = /WALKING_RECORDER_SCHEME = '([^']+)'/.exec(config)?.[1];
    expect(recorderScheme).toBe('excerlock-walkingrecorder');
    const traceScheme = /URL_SCHEME = '([^']+)'/.exec(config)?.[1];
    expect(traceScheme).toBe('excerlock-linked-trace');

    const info = readUtf8(fromRoot('tools', 'phone-walking-recorder', 'Support', 'Info.plist'));
    expect(info).toContain(`<string>${recorderScheme}</string>`);
    const swift = readUtf8(fromRoot('tools', 'phone-walking-recorder', 'Sources', 'CaptureController.swift'));
    expect(swift).toContain(`static let scheme = "${recorderScheme}"`);
    expect(swift).toContain(`static let traceLabScheme = "${traceScheme}"`);

    const project = readUtf8(fromRoot('tools', 'phone-walking-recorder', 'project.yml'));
    expect(project).toContain('PRODUCT_BUNDLE_IDENTIFIER: com.johansardar.excerlock.lab.walkingrecorder');
    const module = readUtf8(app('modules', 'excerlock-enforcement', 'ios', 'ExcerlockEnforcementModule.swift'));
    expect(module).toContain('labWalkingRecorderBundleIdentifier = "com.johansardar.excerlock.lab.walkingrecorder"');
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
