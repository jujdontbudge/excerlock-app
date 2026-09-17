import { readFileSync } from 'node:fs';
import path from 'node:path';

type NativeStartupModule = {
  markInteractiveHome(): boolean;
  markStartupStage(stage: string): boolean;
};

function loadStages(nativeModule: NativeStartupModule | null) {
  let loaded!: typeof import('../../../../modules/excerlock-startup');
  jest.isolateModules(() => {
    // Mock the module boundary the wrapper imports, so the real wrapper's
    // ordering runs against a controllable native sink.
    jest.doMock('../../../../modules/excerlock-startup/src/ExcerlockStartupModule', () => ({
      __esModule: true,
      default: nativeModule,
    }));
    loaded = require('../../../../modules/excerlock-startup');
  });
  return loaded;
}

test('forwards every stage to the native module once and in order', () => {
  const markStartupStage = jest.fn<boolean, [string]>(() => true);
  const module = loadStages({ markInteractiveHome: () => false, markStartupStage });

  for (const stage of module.STARTUP_STAGES) expect(module.markStartupStage(stage)).toBe(true);
  expect(markStartupStage.mock.calls.map(([stage]) => stage)).toEqual([...module.STARTUP_STAGES]);
});

test('repeating a stage is idempotent and never re-enters native', () => {
  const markStartupStage = jest.fn<boolean, [string]>(() => true);
  const module = loadStages({ markInteractiveHome: () => false, markStartupStage });

  expect(module.markStartupStage('HydrationDone')).toBe(true);
  expect(module.markStartupStage('HydrationDone')).toBe(true);
  expect(module.markStartupStage('HydrationDone')).toBe(true);
  expect(markStartupStage).toHaveBeenCalledTimes(1);
});

test('refuses an earlier stage after a later boundary was accepted', () => {
  const markStartupStage = jest.fn<boolean, [string]>(() => true);
  const module = loadStages({ markInteractiveHome: () => false, markStartupStage });

  expect(module.markStartupStage('RuntimeReady')).toBe(true);
  expect(module.markStartupStage('FirstReactRender')).toBe(false);
  expect(markStartupStage).toHaveBeenCalledTimes(1);
});

test('a refused native mark stays retryable instead of being recorded', () => {
  const markStartupStage = jest.fn<boolean, [string]>().mockReturnValueOnce(false).mockReturnValue(true);
  const module = loadStages({ markInteractiveHome: () => false, markStartupStage });

  expect(module.markStartupStage('HydrationDone')).toBe(false);
  expect(module.markStartupStage('HydrationDone')).toBe(true);
  expect(markStartupStage).toHaveBeenCalledTimes(2);
});

test('a missing native module reports unavailable without throwing', () => {
  const module = loadStages(null);

  expect(module.markStartupStage('FirstReactRender')).toBe(false);
  expect(module.markInteractiveHome()).toBe(false);
});

test('a throwing native module reports unavailable without throwing', () => {
  const module = loadStages({
    markInteractiveHome: () => { throw new Error('native failure'); },
    markStartupStage: () => { throw new Error('native failure'); },
  });

  expect(module.markStartupStage('FirstReactRender')).toBe(false);
  expect(module.markInteractiveHome()).toBe(false);
});

test('every JS stage name is a native event name in the Swift module', () => {
  const swift = readFileSync(
    path.resolve(__dirname, '../../../../modules/excerlock-startup/ios/ExcerlockStartupModule.swift'),
    'utf8',
  );
  const stages = loadStages(null).STARTUP_STAGES;

  for (const stage of stages) {
    expect(swift).toContain(`case ${stage[0].toLowerCase()}${stage.slice(1)} = "${stage}"`);
    expect(swift).toContain(`return "${stage}"`);
  }
});
