import { cpSync, existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { appRoot, repoRoot, stateDir } from '../lib/paths.ts';
import { must } from '../lib/shell.ts';
import { makeManifest } from './server.ts';

export const labRoot = () => stateDir('ota-lab');
export const projectRoot = () => join(labRoot(), 'project');
export const labApp = () => join(projectRoot(), 'app-next');
export const labEnv = () => ({ ...process.env, EXCERLOCK_ENV: 'dev', EXCER_OTA_LAB_URL: 'http://127.0.0.1:8098/manifest',
  NODE_ENV: 'production', CI: '1', SENTRY_DISABLE_AUTO_UPLOAD: 'true', EXPO_NO_TELEMETRY: '1' });

const variants = ['embedded', 'copy', 'visual', 'added-page', 'removed-follow-up', 'changed-branch', 'renamed-page', 'crash'] as const;

function change(file: string, transform: (source: string) => string) {
  const path = join(labApp(), file);
  const source = readFileSync(path, 'utf8');
  const changed = transform(source);
  if (changed === source) throw new Error(`Local lab transformation no longer matches ${file}`);
  writeFileSync(path, changed);
}

export function snapshotLab() {
  const root = projectRoot();
  mkdirSync(root, { recursive: true });
  cpSync(appRoot, labApp(), { recursive: true, filter: (path) => path !== join(appRoot, 'ios') && !['node_modules', 'dist', 'build', '.expo', 'evidence', 'coverage', '.excer'].includes(basename(path)) });
  cpSync(join(repoRoot, 'packages'), join(root, 'packages'), { recursive: true, filter: (path) => basename(path) !== 'node_modules' });
  for (const name of ['package.json', 'package-lock.json', 'tsconfig.json']) if (existsSync(join(repoRoot, name))) cpSync(join(repoRoot, name), join(root, name));
  if (!existsSync(join(root, 'node_modules'))) symlinkSync(join(repoRoot, 'node_modules'), join(root, 'node_modules'));
  if (!existsSync(join(labApp(), 'node_modules'))) symlinkSync(join(appRoot, 'node_modules'), join(labApp(), 'node_modules'));
  change('metro.config.js', (source) => source.replace('module.exports = sentryConfig;', `sentryConfig.watchFolders = [...(sentryConfig.watchFolders ?? []), ${JSON.stringify(join(repoRoot, 'node_modules'))}, ${JSON.stringify(join(appRoot, 'node_modules'))}];\nsentryConfig.resolver.nodeModulesPaths = [${JSON.stringify(join(appRoot, 'node_modules'))}, ${JSON.stringify(join(repoRoot, 'node_modules'))}];\nsentryConfig.cacheVersion = 'excerlock-ota-lab-v1';\nmodule.exports = sentryConfig;`));
  change('index.js', (source) => source.replace("import './src/packages/activity/registerLocationTasks';", '').replace("import './src/packages/runtime/productionRuntime';", ''));
  writeFileSync(join(labApp(), 'src/packages/runtime/productionRuntime.ts'), "export async function getProductionRuntime(): Promise<never> { throw new Error('Local OTA lab cannot construct production services'); }\nexport async function disposeProductionRuntime() {}\n");
  change('src/packages/platform/environment.ts', (source) => source.replace("if ((environment === 'dev' || environment == null) && development)", "if (environment === 'dev' || (environment == null && development))"));
  change('src/packages/runtime/lib/createRuntime.ts', (source) => source.replace('if (__DEV__) {', 'if (true) {').replace("if (Platform.OS === 'ios' && process.env.NODE_ENV !== 'test')", "if (false && Platform.OS === 'ios' && process.env.NODE_ENV !== 'test')"));
  change('src/packages/runtime/lib/AppRuntimeProvider.tsx', (source) => source.replace("runtime.kind === 'real' ? <NativeEffects /> : null", '<NativeEffects />').replace('{children}', '{children}\n      <LabFrameHost />').replace("import { OtaResumeHost }", "import { LabFrameHost } from './LabFrameHost';\nimport { OtaResumeHost }"));
  change('src/packages/runtime/lib/NativeRuntimeEffects.tsx', (source) => source.replace('safety?.permissionPromptPending ?? null', "runtime.dev?.snapshot().prompt !== null").replace('safety?.cameraActive ?? null', 'false'));
  change('src/packages/launch/RootNavigator.tsx', (source) => source.replace("__DEV__ && runtime.kind === 'fake'", "runtime.kind === 'fake'"));
  change('src/packages/launch/lib/FakePromptHost.tsx', (source) => source.replace('!__DEV__ || !dev', '!dev'));
  change('src/packages/dev-harness/lib/fakes/SubscriptionFake.ts', (source) => source
    .replace("operation = { busy: true, pending: false, error: null };", "operation = { busy: true, pending: false, error: null };\n      await fetch('http://127.0.0.1:8098/events', { method: 'POST', body: JSON.stringify({ event: 'purchase-start', page: '/lab/purchase' }) });\n      await new Promise((resolve) => setTimeout(resolve, 8000));")
    .replace('restore: async () => {', "restore: async () => {\n      operation = { busy: true, pending: false, error: null };\n      await fetch('http://127.0.0.1:8098/events', { method: 'POST', body: JSON.stringify({ event: 'restore-start', page: '/lab/restore' }) });\n      await new Promise((resolve) => setTimeout(resolve, 8000));\n      operation = { busy: false, pending: false, error: null };"));
  change('src/packages/onboarding/lib/useOnboarding.ts', (source) => "import AsyncStorage from '@react-native-async-storage/async-storage';\n" + source.replace('const boundary = await reloadAtOnboardingBoundary', "await AsyncStorage.setItem('excerlock-ota-lab.answers', JSON.stringify(useOnboardingStore.getState().data.answers));\n    await fetch('http://127.0.0.1:8098/events', { method: 'POST', body: JSON.stringify({ event: 'boundary', from, next, path: currentPath, progress: progressFraction({ step: next, answers: saved.answers }, flowOrder) }) });\n    const boundary = await reloadAtOnboardingBoundary"));
  change('src/packages/onboarding/lib/useOnboarding.ts', (source) => source.replace('transitionStarted: (page: string) => {', "transitionStarted: (page: string) => {\n      void fetch('http://127.0.0.1:8098/events', { method: 'POST', body: JSON.stringify({ event: 'page-entry-start', page: `/onboarding/${page}` }) }).catch(() => undefined);"));
  change('src/packages/onboarding/lib/useOnboarding.ts', (source) => source.replace('transitionSettled: (page: string) => {', "transitionSettled: (page: string) => {\n      void fetch('http://127.0.0.1:8098/events', { method: 'POST', body: JSON.stringify({ event: 'page-entry-end', page: `/onboarding/${page}` }) }).catch(() => undefined);"));
  change('src/packages/onboarding/lib/useOnboarding.ts', (source) => source.replace('advance: async () => {', "advance: async () => {\n      void fetch('http://127.0.0.1:8098/events', { method: 'POST', body: JSON.stringify({ event: 'advance-request', page: `/onboarding/${step}`, entering: nativeTransition.current.busy }) }).catch(() => undefined);"));
  change('src/packages/onboarding/lib/OnboardingShell.tsx', (source) => source.replace('const enter = pageIn(m.reduced, direction).withCallback', "const enter = pageIn(m.reduced, direction).duration((globalThis as typeof globalThis & { otaLabSlowEntry?: boolean }).otaLabSlowEntry && step === 'O02' ? t.motion.duration.emphasized * 4 : t.motion.duration.emphasized).withCallback"));
  change('src/packages/updates/updates.ts', (source) => source
    .replace('await Updates.reloadAsync({', "await fetch('http://127.0.0.1:8098/events', { method: 'POST', body: JSON.stringify({ event: 'reload-start', updateId: Updates.updateId, pending: candidate?.id ?? null }) });\n      await Updates.reloadAsync({")
    .replace('cover = value;', "cover = value;\n  if (!value) void fetch('http://127.0.0.1:8098/events', { method: 'POST', body: JSON.stringify({ event: 'cover-hidden', updateId: Updates.updateId, embedded: Updates.isEmbeddedLaunch }) }).catch(() => undefined);")
    + `
const otaLabJsModuleEpochMs = Date.now();
export const otaLabSnapshot = () => ({ pending: candidate?.id ?? null, version: candidate?.flowVersion ?? null, navigationTransition,
  nativeLaunchMs: Updates.launchDuration, jsModuleEpochMs: otaLabJsModuleEpochMs,
  runtimeStartMs: (performance as Performance & { rnStartupTiming?: { initializeRuntimeStart?: number } }).rnStartupTiming?.initializeRuntimeStart });
export async function otaLabStageSecond() {
  const checked = await Updates.checkForUpdateAsync();
  if (!checked.isAvailable) return;
  const fetched = await Updates.fetchUpdateAsync();
  if (fetched.isNew) await fetch('http://127.0.0.1:8098/events', { method: 'POST', body: JSON.stringify({ event: 'second-ready', pending: fetched.manifest.id }) });
}
`);
  change('app.config.ts', (source) => source.replace('...clientExtra,', "...clientExtra,\n      otaLabVariant: process.env.EXCER_OTA_LAB_VARIANT ?? 'embedded',"));
  writeFileSync(join(labApp(), 'src/packages/runtime/lib/LabFrameHost.tsx'), readFileSync(join(repoRoot, 'tools/excer/ota-lab/LabFrameHost.txt'), 'utf8'));
  return root;
}

export function exportVariants(only?: string) {
  const selected = variants.filter((variant) => !only || variant === only);
  if (!selected.length) throw new Error(`Unknown update fixture ${only}`);
  snapshotLab();
  const flowFile = 'src/packages/onboarding/lib/flow.ts';
  const copyFile = 'src/packages/onboarding/lib/onboardingCopy.ts';
  const routeFile = 'src/packages/onboarding/lib/PreBranchScreen.tsx';
  const baseFlow = readFileSync(join(labApp(), flowFile), 'utf8');
  const baseCopy = readFileSync(join(labApp(), copyFile), 'utf8');
  const baseRoute = readFileSync(join(labApp(), routeFile), 'utf8');
  const baseValidation = readFileSync(join(labApp(), 'src/packages/onboarding/lib/validation.ts'), 'utf8');
  const baseEntry = readFileSync(join(labApp(), 'index.js'), 'utf8');
  const baseTokens = readFileSync(join(labApp(), 'src/packages/ui/tokens.ts'), 'utf8');
  const baseContract = JSON.parse(readFileSync(join(labApp(), 'config/onboardingFlow.json'), 'utf8'));
  for (const variant of selected) {
    console.log(`Preparing ${variant}`);
    writeFileSync(join(labApp(), flowFile), baseFlow);
    writeFileSync(join(labApp(), copyFile), baseCopy);
    writeFileSync(join(labApp(), routeFile), baseRoute);
    writeFileSync(join(labApp(), 'src/packages/onboarding/lib/validation.ts'), baseValidation);
    writeFileSync(join(labApp(), 'index.js'), baseEntry);
    writeFileSync(join(labApp(), 'src/packages/ui/tokens.ts'), baseTokens);
    const changed = ['added-page', 'removed-follow-up', 'changed-branch', 'renamed-page'].includes(variant);
    writeFileSync(join(labApp(), 'config/onboardingFlow.json'), JSON.stringify({ ...baseContract, version: baseContract.version + (changed ? 1 : 0) }));
    if (variant === 'copy') change(copyFile, (source) => source.replace('Block apps.', 'Block distractions.'));
    if (variant === 'visual') change('src/packages/ui/tokens.ts', (source) => source.replace('radius: { card: 20', 'radius: { card: 22'));
    if (variant === 'added-page') {
      change(flowFile, (source) => source.replace("  'O04',", "  'O09',\n  'O04',"));
      change(routeFile, (source) => source.replace('const Screen = screens[step as keyof typeof screens];', "const Screen = screens[(step === 'O09' ? 'O02' : step) as keyof typeof screens];"));
    }
    if (variant === 'removed-follow-up') change(flowFile, (source) => source.replace("if (step === 'O23') return bodyGoals(answers).includes('gain');", "if (step === 'O23') return false;"));
    if (variant === 'changed-branch') {
      change(flowFile, (source) => source.replace("['G0F', 'G0H', 'G1', 'G2'] : ['G0F', 'G0H', 'G1']", "['G0F', 'G0H', 'O09', 'G1', 'G2'] : ['G0F', 'G0H', 'O09', 'G1']"));
      change(routeFile, (source) => source.replace('const Screen = screens[step as keyof typeof screens];', "const Screen = screens[(step === 'O09' ? 'O02' : step) as keyof typeof screens];"));
    }
    if (variant === 'renamed-page') {
      change(flowFile, (source) => source.replace("  'O04',", "  'O09',"));
      change(flowFile, (source) => source.replace("O04: 'name',", "O09: 'name', O04: 'name',").replace("return ['O04',", "return ['O09', 'O04',").replace('const completed = new Set(state.completedSteps ?? []);', "const completed = new Set(state.completedSteps ?? []);\n  if (completed.has('O04')) completed.add('O09');"));
      change('src/packages/onboarding/lib/validation.ts', (source) => source.replace("if (step === 'O04')", "if (step === 'O04' || step === 'O09')"));
      change(routeFile, (source) => source.replace('const Screen = screens[step as keyof typeof screens];', "const Screen = screens[(step === 'O09' ? 'O04' : step) as keyof typeof screens];"));
    }
    if (variant === 'crash') writeFileSync(join(labApp(), 'index.js'), "throw new Error('Local OTA lab crash before first content');\n" + baseEntry);
    const dir = join(labRoot(), 'updates', variant);
    mkdirSync(dir, { recursive: true });
    const env = { ...labEnv(), EXCER_OTA_LAB_VARIANT: variant };
    const log = must('npx', ['expo', 'export', '--platform', 'ios', '--max-workers', '2', '--output-dir', dir], { cwd: labApp(), env, timeout: 240000 });
    writeFileSync(join(dir, 'export.log'), log);
    const config = JSON.parse(must('npx', ['expo', 'config', '--type', 'public', '--json'], { cwd: labApp(), env }));
    const manifest = makeManifest(dir, config, `http://127.0.0.1:8098`);
    const rewrite = (asset: { url: string }) => { asset.url = asset.url.replace('/assets/', `/assets/${variant}/`); };
    rewrite(manifest.launchAsset); manifest.assets.forEach(rewrite);
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest));
  }
  snapshotLab();
  console.log(`Prepared updates in ${join(labRoot(), 'updates')}`);
}
