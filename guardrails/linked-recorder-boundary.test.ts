import { describe, expect, it } from 'vitest';

import { fromRoot, readJson, readUtf8, walkFiles } from './repo-files';

type Eas = { build?: Record<string, unknown> };
type ExpoConfig = { expo?: { ios?: { bundleIdentifier?: string } } };

const app = (...parts: string[]) => fromRoot('app-next', ...parts);
const recorder = (...parts: string[]) => fromRoot('tools', 'phone-walking-recorder', ...parts);

describe('linked recorder research boundary', () => {
  it('keeps production identifiers and EAS profiles free of the research target', () => {
    const config = readJson<ExpoConfig>(app('app.json'));
    const eas = readJson<Eas>(app('eas.json'));
    expect(config.expo?.ios?.bundleIdentifier).toBe('com.johansardar.excerlock');
    expect(Object.keys(eas.build ?? {})).not.toContain('linked-recorder');

    const helper = readUtf8(app('config', 'linkedRecorderResearch.ts'));
    expect(helper).toContain("app: 'com.johansardar.excerlock.lab.linkedtrace'");
    expect(helper).toContain('local-only and cannot use EAS Build profiles');
    expect(helper).toContain('enabled: false');
    expect(helper).toContain("checkAutomatically: 'NEVER'");

    const appConfig = readUtf8(app('app.config.ts'));
    expect(appConfig).toContain("EXCERLOCK_LINKED_RECORDER_TRACE");
    expect(appConfig).toContain("plugin[0] : plugin) !== '@sentry/react-native/expo'");
  });

  it('requires explicit native and JS compile gates around production-path tracing', () => {
    const swiftFiles = [
      app('modules', 'excerlock-enforcement', 'ios', 'LinkedTraceWriter.swift'),
      app('modules', 'excerlock-enforcement', 'ios', 'EnforcementPolicy.swift'),
      app('modules', 'excerlock-enforcement', 'ios', 'ExcerlockEnforcementModule.swift'),
      app('modules', 'excerlock-motion', 'ios', 'CoreMotionService.swift'),
      app('targets', 'DeviceActivityMonitorExtension', 'GuardedDeviceActivityMonitorExtension.swift'),
    ];
    for (const file of swiftFiles) {
      const source = readUtf8(file);
      expect(source).toContain('EXCERLOCK_LINKED_RECORDER_TRACE');
    }
    expect(readUtf8(swiftFiles[0]!)).toMatch(/^#if EXCERLOCK_LINKED_RECORDER_TRACE/);
    const policy = readUtf8(app('modules', 'excerlock-enforcement', 'ios', 'EnforcementPolicy.swift'));
    expect(policy).toContain('LinkedTraceWriter.shared.recordDeferred(');
    expect(policy).not.toContain('LinkedTraceWriter.shared.record(');

    const tracedTypeScript = [
      app('src', 'runtime', 'detection', 'MotionAdapter.ts'),
      app('src', 'runtime', 'detection', 'DetectionService.ts'),
      app('src', 'runtime', 'enforcement', 'EnforcementHost.ts'),
      app('src', 'runtime', 'createRealRuntime.ts'),
      app('src', 'engine', 'signals', 'location', 'registerLocationTasks.ts'),
    ];
    for (const file of tracedTypeScript) {
      expect(readUtf8(file)).toContain('__LINKED_RECORDER_TRACE__');
    }
    expect(readUtf8(app('babel.config.js'))).toContain('inlineLinkedRecorderResearch');
    expect(readUtf8(app('metro.config.js'))).toContain("LinkedTrace.disabled.ts");
    expect(readUtf8(app('metro.config.js'))).toContain(".*\\.research\\.(ts|tsx)$");
  });

  it('keeps the recorder unentitled and the offline joiner network-free', () => {
    const project = readUtf8(recorder('project.yml'));
    const recorderSource = walkFiles(recorder('Sources'), new Set(['.swift'])).map(readUtf8).join('\n');
    expect(project).not.toMatch(/application-groups|CODE_SIGN_ENTITLEMENTS|UIBackgroundModes/);
    expect(recorderSource).not.toMatch(/UserDefaults\(suiteName|containerURL\(forSecurityApplicationGroupIdentifier|FamilyControls|ManagedSettings/);
    expect(recorderSource).not.toMatch(/URLSession|uploadTask|dataTask/);
    expect(recorderSource).toContain('excerlock-linked-trace');
    expect(recorderSource).toContain('"linkedNonceExported": false');

    const joiner = readUtf8(fromRoot('tools', 'linked-recorder', 'join.py'));
    expect(joiner).not.toMatch(/requests|urllib|httpx|socket/);
    expect(joiner).toContain('managedSettingsReturnedMeansVisibleShield');
    expect(joiner).toContain('joinProvesCausation');
  });

  it('ships an artifact scanner for ordinary JS and native exports', () => {
    const scanner = readUtf8(app('scripts', 'verify-no-linked-trace.cjs'));
    for (const marker of ['LinkedTraceWriter', 'motion_callback_native', 'detector_persist', 'canary_outcome']) {
      expect(scanner).toContain(marker);
    }
    expect(readUtf8(app('scripts', 'check.sh'))).toContain('verify-no-linked-trace.cjs dist');
    expect(readUtf8(app('scripts', 'verify-binary.sh'))).toContain('verify-no-linked-trace.cjs');
  });
});
