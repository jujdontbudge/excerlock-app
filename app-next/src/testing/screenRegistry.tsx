import { Slot } from 'expo-router';
import { AppRuntimeProvider } from '../runtime/AppRuntimeProvider';
import { Runtime } from '../runtime/createRuntime';
import { onboardingStore } from '../state/onboardingStore';
import { preBranch, tail } from '../onboarding/flow';
import { BootScreen } from '../features/launch/BootScreen';
import { BootGate } from '../features/launch/BootGate';
import { GymPickerScreen } from '../features/gym-picker/GymPickerScreen';
import Tabs from '../../app/(tabs)/_layout';
import Home from '../../app/(tabs)/home';
import Conditions from '../../app/(tabs)/conditions';
import Analytics from '../../app/(tabs)/analytics';
import Settings from '../../app/(tabs)/settings';
import Builder from '../../app/builder';
import Paywall from '../../app/paywall';
import SignIn from '../../app/sign-in';
import Account from '../../app/settings/account';
import Gyms from '../../app/settings/gyms';
import Support from '../../app/settings/support';
import Legal from '../../app/settings/legal/[doc]';
import Permission from '../../app/settings/permission/[name]';
import GymUnlock from '../../app/unlock/gym';
import TreadmillUnlock from '../../app/unlock/treadmill';
import Onboarding from '../../app/onboarding/[step]';
import Setup from '../../app/setup/[step]';
import LockedApps from '../../app/locked-apps';

/**
 * Every shipping screen, as a URL into the real route files plus the demo scenario (and store
 * preparation) that puts it in a representative state. Audits iterate this list, so a new route
 * or a new screen state is registered here to be covered.
 */
export type ScreenEntry = {
  name: string;
  url: string;
  scenario: string;
  prepare?: (runtime: Runtime) => void | Promise<void>;
  /** Where the URL settles when the screen's own job is to redirect. */
  landsOn?: string;
};

/** The route table the audits mount: the real `app/` files, without the navigator's entitlement guards. */
export function appRoutes(runtime: Runtime) {
  return {
    _layout: () => (
      <AppRuntimeProvider runtime={runtime}>
        <Slot />
      </AppRuntimeProvider>
    ),
    index: BootGate,
    boot: BootScreen,
    'locked-apps': LockedApps,
    '(tabs)/_layout': Tabs,
    '(tabs)/home': Home,
    '(tabs)/conditions': Conditions,
    '(tabs)/analytics': Analytics,
    '(tabs)/settings': Settings,
    builder: Builder,
    paywall: Paywall,
    'sign-in': SignIn,
    'gym-picker': GymPickerScreen,
    'settings/account': Account,
    'settings/gyms': Gyms,
    'settings/support': Support,
    'settings/legal/[doc]': Legal,
    'settings/permission/[name]': Permission,
    'unlock/gym': GymUnlock,
    'unlock/treadmill': TreadmillUnlock,
    'onboarding/[step]': Onboarding,
    'setup/[step]': Setup,
    dev: () => null,
  };
}

const profile = {
  name: 'Alex',
  referralSource: 'friend',
  ageBand: '25–34',
  occupation: 'Remote worker',
  improveFirst: 'exercise',
  mainReason: 'focus',
  estimatedDailyMinutes: 180,
};
const branches: Record<string, { steps: string[]; answers: Record<string, string | number> }> = {
  'walking steps': { steps: ['W1', 'W2', 'W3'], answers: { activity: 'walking', walkingMode: 'steps' } },
  'walking minutes': { steps: ['W4'], answers: { activity: 'walking', walkingMode: 'minutes', place: 'treadmill' } },
  gym: { steps: ['G1', 'G2'], answers: { activity: 'gym', gymMode: 'duration' } },
  running: { steps: ['R1', 'R2'], answers: { activity: 'running', runMode: 'minutes' } },
  'running distance': { steps: ['D'], answers: { activity: 'running', runMode: 'distance' } },
  biking: { steps: ['B1', 'B2'], answers: { activity: 'biking', bikeMode: 'minutes' } },
};
const onboarding = (step: string, answers: Record<string, string | number>): ScreenEntry => ({
  name: `Onboarding ${step}`,
  url: `/onboarding/${step}`,
  scenario: 'fresh-install',
  prepare: () => onboardingStore.getState().patch({ step, answers: { ...profile, ...answers } }),
});
const setup = (step: string, scenario = 'home-locked-walking'): ScreenEntry => ({
  name: `Setup ${step} (${scenario})`,
  url: `/setup/${step}`,
  scenario,
  prepare: () => onboardingStore.getState().patch({ setupComplete: false, setupStep: step }),
});
const at = (name: string, url: string, scenario: string): ScreenEntry => ({ name: `${name} (${scenario})`, url, scenario });

export const screens: ScreenEntry[] = [
  at('Boot', '/boot', 'fresh-install'),
  ...preBranch.map((step) => onboarding(step, branches['walking steps'].answers)),
  ...Object.values(branches).flatMap((b) => b.steps.map((step) => onboarding(step, b.answers))),
  ...tail.map((step) => onboarding(step, branches['walking steps'].answers)),
  ...['X1', 'X2', 'X3b', 'X4', 'X5'].map((step) => setup(step)),
  setup('X3a', 'gym-arrival-user'),
  setup('X5', 'home-permission-needed'),
  ...[
    'home-locked-walking',
    'home-unlocked-met',
    'home-before-window',
    'home-permission-needed',
    'home-no-apps',
    'home-no-rules',
    'home-two-conditions-locked',
    'home-walking-session',
    'multi-rule-overlap',
    'gym-arrival-user',
    'billing-issue',
    'window-crosses-midnight',
  ].map((scenario) => at('Home', '/home', scenario)),
  ...['multi-rule-overlap', 'home-no-rules', 'home-two-conditions-locked'].map((s) => at('Conditions', '/conditions', s)),
  at('Builder new', '/builder', 'fresh-install'),
  at('Builder edit walking', '/builder?id=walk', 'home-locked-walking'),
  at('Builder edit gym', '/builder?id=gym', 'gym-arrival-user'),
  at('Builder edit running', '/builder?id=run', 'runner-distance'),
  ...['analytics-6-weeks', 'analytics-day-zero', 'analytics-no-measurement', 'home-no-rules'].map((s) =>
    at('Analytics', '/analytics', s),
  ),
  ...['multi-rule-overlap', 'home-permission-needed', 'billing-issue', 'trial-active'].map((s) =>
    at('Settings', '/settings', s),
  ),
  at('Account', '/settings/account', 'multi-rule-overlap'),
  at('Account', '/settings/account', 'signed-in-apple'),
  at('Gyms', '/settings/gyms', 'gym-arrival-user'),
  at('Gyms', '/settings/gyms', 'fresh-install'),
  at('Support', '/settings/support', 'multi-rule-overlap'),
  at('Privacy policy', '/settings/legal/privacy', 'multi-rule-overlap'),
  at('Terms', '/settings/legal/terms', 'multi-rule-overlap'),
  ...['screenTime', 'motion', 'location', 'health', 'camera', 'notifications'].map((name) =>
    at(`Permission ${name}`, `/settings/permission/${name}`, 'multi-rule-overlap'),
  ),
  at('Permission screenTime', '/settings/permission/screenTime', 'home-permission-needed'),
  at('Sign in', '/sign-in', 'fresh-install'),
  at('Paywall', '/paywall', 'trial-expired'),
  at('Paywall', '/paywall', 'billing-issue'),
  at('Paywall', '/paywall', 'fresh-install'),
  at('Gym picker', '/gym-picker', 'fresh-install'),
  at('Gym picker edit', '/gym-picker?placeId=gym-1', 'gym-arrival-user'),
  at('Gym ceremony', '/unlock/gym?ruleId=gym', 'unlock-gym-inside'),
  at('Gym ceremony', '/unlock/gym?ruleId=gym', 'unlock-gym-outside'),
  at('Gym ceremony', '/unlock/gym?ruleId=gym', 'unlock-gym-lost'),
  at('Gym ceremony preview', '/unlock/gym?preview=1', 'fresh-install'),
  at('Treadmill ceremony', '/unlock/treadmill?ruleId=walk', 'unlock-treadmill-scan'),
  at('Treadmill ceremony', '/unlock/treadmill?ruleId=walk', 'unlock-treadmill-denied'),
  at('Treadmill ceremony', '/unlock/treadmill?ruleId=walk', 'treadmill-duration-rule'),
  at('Treadmill ceremony preview', '/unlock/treadmill?preview=1', 'home-walking-session'),
  { ...at('Locked apps landing', '/locked-apps', 'trial-expired'), landsOn: '/paywall' },
];
