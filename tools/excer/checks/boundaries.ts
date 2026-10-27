import { existsSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { appRoot, fromRoot, rel, serverRoot } from '../lib/paths.ts';
import { importsModule, read, walk } from '../lib/files.ts';
import { verdict, type Check } from './types.ts';

const appSources = () => [...walk(join(appRoot, 'src')), ...walk(join(appRoot, 'app'))];

function onlyOwners(files: string[], module: RegExp, owners: string[]): string[] {
  return files
    .filter((file) => importsModule(read(file), module))
    .map(rel)
    .filter((file) => !owners.includes(file))
    .map((file) => `${file} imports ${module.source}; only ${owners.join(', ')} may`);
}

export const noTests: Check = {
  name: 'no-tests',
  why: 'The repository verifies through ./excer, not test suites (ADR 0045).',
  tier: 'static',
  run() {
    const roots = ['app-next', 'server', 'packages', 'tools'].map((dir) => fromRoot(dir));
    const offenders = roots
      .flatMap((root) => walk(root))
      .filter((file) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(file) || file.includes('/__tests__/'))
      .map(rel);
    const configs = ['vitest.config.ts', 'jest.config.js', 'app-next/jest.config.js', 'server/vitest.config.ts']
      .filter((path) => existsSync(fromRoot(path)))
      .map((path) => `${path} is a test runner config`);
    return verdict([...offenders.map((file) => `${file} is a test file`), ...configs]);
  },
};

export const updatesOwner: Check = {
  name: 'updates-owner',
  why: 'Only src/packages/updates/updates.ts talks to expo-updates, never through ON_ERROR_RECOVERY (docs/ota.md), and an update applies only on a cold start (ADR 0070).',
  tier: 'static',
  run() {
    const owner = 'app-next/src/packages/updates/updates.ts';
    const problems = onlyOwners(appSources(), /expo-updates/, [owner]);
    const source = existsSync(fromRoot(owner)) ? read(fromRoot(owner)) : '';
    if (!importsModule(source, /expo-updates/)) problems.push(`${owner} must own the expo-updates import`);
    if (/ON_ERROR_RECOVERY/.test(source)) problems.push(`${owner} uses ON_ERROR_RECOVERY`);
    if (!/export const OTA_APPLY_ON_COLD_START_ONLY = true;/.test(source))
      problems.push(`${owner} must keep OTA_APPLY_ON_COLD_START_ONLY = true: a reload of a running or resuming app can hang it (ADR 0070)`);
    if ((source.match(/Updates\.reloadAsync\(/g) ?? []).length > 1 || (source.match(/this\.updates\.reload\(/g) ?? []).length > 1)
      problems.push(`${owner} may reload in one place only, behind OTA_APPLY_ON_COLD_START_ONLY`);
    if (/import[^;]*(onboarding|paywall|subscriptionport)/i.test(source))
      problems.push(`${owner} imports paywall or onboarding state; the OTA coordinator takes primitives only`);
    return verdict(problems);
  },
};

export const analyticsEmitter: Check = {
  name: 'analytics-emitter',
  why: 'One PostHog emitter per side, so every event passes the registry and privacy filter.',
  tier: 'static',
  run() {
    return verdict([
      ...onlyOwners(appSources(), /posthog-react-native/, ['app-next/src/packages/telemetry/createPostHogRuntime.ts']),
      ...onlyOwners(walk(join(serverRoot, 'src')), /posthog-node/, ['server/src/packages/analytics/analytics.ts']),
    ]);
  },
};

const reviewedFlags = ['paywall_variant', 'review_preset'];

export const flagRegistry: Check = {
  name: 'flag-registry',
  why: 'PostHog flags an OTA can move are the reviewed set; a new flag is new-submission material (docs/ota.md).',
  tier: 'static',
  run() {
    const adapter = 'app-next/src/packages/telemetry/PostHogAnalyticsAdapter.ts';
    const union = /export type FlagName =([^;]+);/.exec(read(fromRoot(adapter)))?.[1] ?? '';
    const flags = [...union.matchAll(/'([^']+)'/g)].map((match) => match[1] ?? '').sort();
    const problems: string[] = [];
    if (flags.length === 0) problems.push(`${adapter} no longer declares FlagName`);
    else if (flags.join() !== reviewedFlags.join())
      problems.push(
        `FlagName is [${flags.join(', ')}], reviewed set is [${reviewedFlags.join(', ')}]. Adding a flag needs a new App Store submission; update tools/excer/checks/boundaries.ts only with that release.`,
      );
    return verdict(problems);
  },
};

export const shieldCopyParity: Check = {
  name: 'shield-copy-parity',
  why: 'Swift extension, native writer and TypeScript agree on the shield copy App Group key and causes.',
  tier: 'static',
  run() {
    const reader = read(fromRoot('app-next/targets/ShieldConfiguration/ShieldContent.swift'));
    const writer = read(fromRoot('app-next/modules/excerlock-enforcement/ios/ShieldCopyOverrides.swift'));
    const ts = read(fromRoot('app-next/src/packages/enforcement/shieldCopyOverrides.ts'));
    const readerKey = /copyOverridesKey = "([^"]+)"/.exec(reader)?.[1];
    const writerKey = /excerlockShieldCopyOverridesDefaultsKey = "([^"]+)"/.exec(writer)?.[1];
    const tsKey = /SHIELD_COPY_OVERRIDES_KEY = '([^']+)'/.exec(ts)?.[1];
    const problems: string[] = [];
    if (readerKey !== 'excerlock.shield.copy-overrides.v1') problems.push(`ShieldContent.swift key is ${readerKey}; it is a shipped invariant`);
    if (writerKey !== readerKey) problems.push(`ShieldCopyOverrides.swift key ${writerKey} differs from ${readerKey}`);
    if (tsKey !== readerKey) problems.push(`shieldCopyOverrides.ts key ${tsKey} differs from ${readerKey}`);
    const swiftCauses = [...(/enum ShieldCause[^{]*\{([^}]*)\}/.exec(reader)?.[1] ?? '').matchAll(/case\s+(\w+)/g)]
      .map((match) => match[1])
      .sort();
    const tsCauses = [...(/SHIELD_COPY_CAUSES = \[([^\]]*)\]/.exec(ts)?.[1] ?? '').matchAll(/'(\w+)'/g)]
      .map((match) => match[1])
      .sort();
    if (swiftCauses.length === 0 || swiftCauses.join() !== tsCauses.join())
      problems.push(`ShieldCause [${swiftCauses.join(', ')}] differs from SHIELD_COPY_CAUSES [${tsCauses.join(', ')}]`);
    return verdict(problems);
  },
};

export const researchIsolation: Check = {
  name: 'research-isolation',
  why: 'Recorder and lab research never ship in the App Store app (ADRs 0026–0028).',
  tier: 'static',
  run() {
    const problems: string[] = [];
    const appJson = JSON.parse(read(fromRoot('app-next/app.json'))) as { expo?: { ios?: { bundleIdentifier?: string } } };
    if (appJson.expo?.ios?.bundleIdentifier !== 'com.johansardar.excerlock')
      problems.push('app-next/app.json bundle identifier must stay com.johansardar.excerlock');
    const eas = JSON.parse(read(fromRoot('app-next/eas.json'))) as { build?: Record<string, unknown> };
    for (const profile of Object.keys(eas.build ?? {}))
      if (/research|recorder|lab/i.test(profile)) problems.push(`eas.json has research profile ${profile}`);
    for (const file of appSources()) {
      const source = read(file);
      if (/\.research(\.tsx?)?['"]/.test(source) && !/\.research\.tsx?$/.test(file) && !/packages\/(research|trace)\//.test(rel(file)))
        problems.push(`${rel(file)} imports a .research module outside the research boundary`);
      if (/['"][./]*tools\/(phone|linked)/.test(source)) problems.push(`${rel(file)} imports a recorder from tools/`);
    }
    return verdict(problems);
  },
};

export const ciPinned: Check = {
  name: 'ci-pinned',
  why: 'CI actions run at reviewed immutable commits.',
  tier: 'static',
  run() {
    const dir = fromRoot('.github', 'workflows');
    const problems: string[] = [];
    for (const file of walk(dir, ['.yml', '.yaml'])) {
      for (const match of read(file).matchAll(/uses:\s*([^\s#]+)/g)) {
        const ref = match[1] ?? '';
        if (!ref.startsWith('./') && !/@[0-9a-f]{40}$/.test(ref)) problems.push(`${rel(file)}: ${ref} is not pinned to a commit`);
      }
    }
    return verdict(problems);
  },
};

export const deployHostKey: Check = {
  name: 'deploy-host-key',
  why: 'Production deploys only reach a host whose SSH key was verified beforehand.',
  tier: 'static',
  run() {
    const script = read(fromRoot('deploy', 'deploy.sh'));
    const problems: string[] = [];
    if (!/StrictHostKeyChecking=yes/.test(script)) problems.push('deploy/deploy.sh must pass StrictHostKeyChecking=yes');
    if (/StrictHostKeyChecking=(no|accept-new)/.test(script)) problems.push('deploy/deploy.sh must not accept unknown host keys');
    return verdict(problems);
  },
};

export const agentLayout: Check = {
  name: 'agent-layout',
  why: 'One instruction file and one skills folder serve Claude Code, Pi, Hermes and Codex (ADR 0044).',
  tier: 'static',
  run() {
    const problems: string[] = [];
    for (const file of ['CLAUDE.md', 'GEMINI.md'])
      if (read(fromRoot(file)).trim() !== '@AGENTS.md') problems.push(`${file} must be exactly @AGENTS.md`);
    if (/^@/m.test(read(fromRoot('AGENTS.md')))) problems.push('AGENTS.md must not use @imports; Pi and Hermes do not expand them');
    if (existsSync(fromRoot('.hermes.md'))) problems.push('.hermes.md would shadow AGENTS.md in Hermes');
    if (existsSync(fromRoot('.mcp.json'))) problems.push('.mcp.json is not used; configure MCP at user level');
    const skills = fromRoot('.claude', 'skills');
    if (!existsSync(skills) || !statSync(skills).isDirectory()) problems.push('.claude/skills must link to ../.agents/skills');
    for (const skill of walk(fromRoot('.agents', 'skills'), ['.md']).filter((file) => basename(file) === 'SKILL.md')) {
      const name = /^name:\s*(\S+)/m.exec(read(skill))?.[1];
      const folder = basename(join(skill, '..'));
      if (rel(skill).split('/').length !== 4) problems.push(`${rel(skill)} is nested; only .agents/skills/<name>/SKILL.md is a skill`);
      else if (name !== folder) problems.push(`${rel(skill)} name ${name} must equal its folder ${folder}`);
    }
    return verdict(problems);
  },
};

const reviewedAdEvents = 'registration:|view_content:|start_trial:|subscribe:value,currency';

export const adAttribution: Check = {
  name: 'ad-attribution',
  why: 'Only the reviewed events and properties reach Meta and TikTok, never health, motion, place or gym data (App Review 5.1.3, ADR 0084).',
  tier: 'static',
  run() {
    const pkg = 'app-next/src/packages/ad-attribution';
    const problems = [
      ...onlyOwners(appSources(), /excerlock-meta-events/, [`${pkg}/lib/native/metaSink.ts`]),
      ...onlyOwners(appSources(), /excerlock-tiktok-events/, [`${pkg}/lib/native/tiktokSink.ts`]),
      ...onlyOwners(appSources(), /expo-tracking-transparency/, [`${pkg}/lib/native/trackingConsent.ts`]),
      ...onlyOwners(appSources(), /react-native-fbsdk-next/, []),
    ];
    const events = read(fromRoot(pkg, 'lib', 'adEvents.ts'));
    const table = /AD_EVENT_PROPERTIES = \{([^}]+)\}/.exec(events)?.[1] ?? '';
    const declared = [...table.matchAll(/(\w+): \[([^\]]*)\]/g)]
      .map(([, name, props]) => `${name}:${[...(props ?? '').matchAll(/'(\w+)'/g)].map((match) => match[1]).join(',')}`)
      .join('|');
    if (declared !== reviewedAdEvents)
      problems.push(`ad event allow-list is [${declared}], reviewed set is [${reviewedAdEvents}]; a new property needs a privacy review and ADR 0084`);
    for (const file of walk(fromRoot(pkg))) {
      const source = read(file);
      const imports = [...source.matchAll(/from '\.\.\/([a-z-]+)\//g)].map((match) => match[1]);
      for (const name of imports) if (name !== 'ports') problems.push(`${rel(file)} imports ${name}; ad-attribution reads only ports`);
    }
    const tiktok = read(fromRoot('app-next/modules/excerlock-tiktok-events/ios/ExcerlockTikTokEventsModule.swift'));
    const meta = read(fromRoot('app-next/modules/excerlock-meta-events/ios/ExcerlockMetaEventsModule.swift'));
    const metaStartup = read(fromRoot('app-next/modules/excerlock-meta-events/ios/ExcerlockMetaAppDelegateSubscriber.swift'));
    const metaSpec = read(fromRoot('app-next/modules/excerlock-meta-events/ios/ExcerlockMetaEvents.podspec'));
    if (!metaSpec.includes("'FBSDKCoreKit', '19.0.0'")) problems.push('Meta SDK must stay pinned to the reviewed 19.0.0 release');
    const metaInitialization = metaStartup.indexOf('ApplicationDelegate.shared.application');
    for (const setting of ['isMetaDataCollectionEnabled', 'isAutoLogProductImprovementEnabled', 'isSKAdNetworkReportEnabled']) {
      const assignment = metaStartup.indexOf(`Settings.shared.${setting} = false`);
      if (assignment < 0 || assignment > metaInitialization) problems.push(`Meta ${setting} must be disabled before SDK initialization`);
    }
    const plugin = read(fromRoot('app-next/plugins/withAdAttribution.js'));
    const tiktokPatch = read(fromRoot('app-next/modules/excerlock-tiktok-events/ios/disable-payment-tracking.rb'));
    const keys = [...tiktok.matchAll(/addProperty\(withKey: "(\w+)"/g)].map((match) => match[1]).sort().join(',');
    if (keys !== 'currency,value') problems.push(`TikTok events carry [${keys}]; only value and currency are reviewed`);
    if ([...meta.matchAll(/parameters\[\.(\w+)\]/g)].map((match) => match[1]).join(',') !== 'currency') problems.push('Meta events carry parameters beyond fb_currency');
    if (!/config\.disablePaymentTracking\(\)/.test(tiktok)) problems.push('TikTok payment tracking must stay disabled: Adapty owns StoreKit transactions');
    if (!tiktok.includes('config.disableAutoEnhancedDataPostbackEvent()')) problems.push('TikTok enhanced data postback must stay disabled: screen and interaction capture is not reviewed');
    if (!plugin.includes('excerlock_disable_tiktok_payment_tracking(installer)')) problems.push('TikTok remote config must respect disabled automatic payment tracking before StoreKit starts');
    if (!tiktokPatch.includes('tiktokConfig.paymentTrackingStatus != TikTokPaymentTrackStatus_disabled && globalConfigPaymentTrackingEnabled')) problems.push('TikTok pinned source patch must respect explicit payment disable');
    if (!tiktokPatch.includes('self.screenshotEnabled = NO; /* ExcerLock:')) problems.push('TikTok remote screenshot capture must stay disabled');
    if (/setTrackingEnabled|disableSKAdNetworkSupport/.test(tiktok)) problems.push('TikTok setTrackingEnabled stops every event and TikTok owns SKAdNetwork; neither may be called');
    if (!/if testMode \{ config\.enableDebugMode\(\) \}/.test(tiktok)) problems.push('TikTok debug mode must stay behind testMode');
    for (const key of ['FacebookSKAdNetworkReportEnabled: false', 'FBSDKAutoLogMetaDataEnabled: false', 'FBSDKAutoLogProductImprovementEnabled: false'])
      if (!plugin.includes(key)) problems.push(`withAdAttribution must set ${key}`);
    return verdict(problems);
  },
};
