import { settleBankDrain } from '../bank/BankLifecycle';
import { startFakeBankEvidence } from './lib/bankEvidence';
import { createBankDrainFake } from './lib/fakes/BankDrainFake';
import type { GymLocationFix } from '../ports/GymPort';
import { FakePickerHost } from './FakePickerHost';
import { noteObservedEntitlement } from '../subscription/winbackSession';
import { activityHistory } from './lib/activityHistory';
import { stores } from '../launch/stores';
import { SupportFake } from './lib/fakes/SupportFake';
import { ReviewFake } from './lib/fakes/ReviewFake';
import { IncidentReportFake } from './lib/fakes/IncidentReportFake';
import { Runtime } from '../ports/Runtime';
import { dayKey } from '../schedule/schedule';
import { contextPersistence } from './lib/contextPersistence';
import { scenarios } from './lib/scenarios';
import { FakeContext } from './lib/FakeContext';
import { loadScenario } from './lib/scenarioLoader';
import { permissionsStore } from '../permissions/permissionsStore';
import { entitlementStore } from '../subscription/entitlementStore';
import { sessionStore } from '../identity/sessionStore';
import { ScreenTimeFake } from './lib/fakes/ScreenTimeFake';
import { StepsFake } from './lib/fakes/StepsFake';
import { WalkingFake } from './lib/fakes/WalkingFake';
import { GaitFake } from './lib/fakes/GaitFake';
import { GymFake } from './lib/fakes/GymFake';
import { AuthFake } from './lib/fakes/AuthFake';
import { SubscriptionFake } from './lib/fakes/SubscriptionFake';
import { createOnboardingOffer } from '../subscription/createOnboardingOffer';
import { trialReminderPlan } from '../notifications/notificationPlan';
import { AnalyticsFake } from './lib/fakes/AnalyticsFake';
import { AdAttributionFake } from './lib/fakes/AdAttributionFake';
import { NotificationsFake } from './lib/fakes/NotificationsFake';
import { SyncFake } from './lib/fakes/SyncFake';
import { identityLabHost } from './lib/fakes/identityLabHost';
import { historyStore } from '../progress/historyStore';
import { profileStore } from '../preferences/profileStore';
import { makeRule } from './lib/scenarios/base';
import { rulesStore } from '../conditions/rulesStore';
import { settingsStore } from '../preferences/settingsStore';
import { NotificationResponsesFake } from './lib/fakes/NotificationResponsesFake';
import { admitPaid, finishSetup } from '../journey/index';
import { pathFor } from '../onboarding/onboardingPath';
import { onboardingStore } from '../onboarding/onboardingStore';
import { classBackedPort } from './lib/fakes/classBackedPort';
import { enforcementPolicyEvidence } from './lib/enforcementPolicyEvidence';
export type FakeRuntimeInstance = Runtime & { kind: 'fake'; dev: NonNullable<Runtime['dev']> };
export type FakeRuntimeOptions = {
  gymFixSource?: () => Promise<GymLocationFix | null>;
  nativeReview?: Runtime['review'];
  createAccountData(): {
    prepare(): Promise<void>;
    deactivate(options?: { carryToNextAccount?: boolean }): Promise<void>;
    eraseActive(): Promise<void>;
    activate(userId: string): Promise<{ changedAccount: boolean }>;
    snapshot(): { activeUserId: string | null; legacyQuarantined: boolean };
    seedActivity?(account: 'A' | 'B'): void;
    activityCheckpoint?(): string;
  };
};
export function FakeRuntime(options: FakeRuntimeOptions): FakeRuntimeInstance {
  let accountData = options.createAccountData();
  const ctx = new FakeContext(scenarios[0]),
    adAttribution = AdAttributionFake(ctx),
    bankDrain = createBankDrainFake(() => ctx.clock.now()),
    notificationResponses = NotificationResponsesFake((snapshot) => ctx.update({ notificationResponses: snapshot })),
    walking = WalkingFake(ctx),
    gait = GaitFake(false, () => ctx.request('camera')),
    persistence = contextPersistence(ctx),
    gym = GymFake(ctx, options.gymFixSource),
    activity = activityHistory(ctx),
    accountLabel = (userId: string | null) =>
      userId === 'lab-user-a' ? 'A' as const : userId === 'lab-user-b' ? 'B' as const : userId === 'lab-existing' ? 'Existing' as const : userId ? 'Checkout' as const : 'None' as const,
    updateAccountDataView = () => {
      const snapshot = accountData.snapshot();
      ctx.update({ accountData: {
        active: accountLabel(snapshot.activeUserId),
        legacyQuarantined: snapshot.legacyQuarantined,
        checkpoints: ctx.snapshot().accountData?.checkpoints,
        activityCheckpoints: ctx.snapshot().accountData?.activityCheckpoints,
      } });
    },
    accountCheckpoint = () =>
      `${rulesStore.getState().data.rules[0]?.id}/${historyStore.getState().data.days.length}/${profileStore.getState().data.name}/${settingsStore.getState().data.gymPlaces[0]?.name}`,
    identityLab = identityLabHost(ctx, () => ready, {
      prepare: async () => {
        await accountData.prepare();
        updateAccountDataView();
      },
      beforeAccountSwitch: async ({ carryGuestData, signedOut }) => {
        await settleBankDrain(bankDrain);
        await accountData.deactivate({ carryToNextAccount: carryGuestData });
        if (signedOut) {
          onboardingStore.getState().reset();
          await onboardingStore.persistBarrier();
        }
        updateAccountDataView();
      },
      prepareAccount: async (identity) => {
        if (!identity.userId) throw new Error('Account identity is missing');
        await accountData.activate(identity.userId);
        updateAccountDataView();
      },
      afterDelete: async () => {
        await accountData.eraseActive();
        updateAccountDataView();
      },
      seedAccount: (account) => seedAccount(account),
      accountCheckpoint,
      adAttribution,
    }),
    ready = persistence.ready.then(async () => {
      await Promise.all(
        stores
          .filter((store) => !store.persist.hasHydrated())
          .map(
            (store) =>
              new Promise<void>((resolve) => {
                const stop = store.persist.onFinishHydration(() => {
                  stop();
                  resolve();
                });
              }),
          ),
      );
      await gym.ready();
      walking.resume();
      gait.set(ctx.scenario.gait ?? 'none');
      activity.refresh();
      adAttribution.reset();
      identityLab.start();
      launchEntitlements = (ctx.scenario.entitlementTimeline ?? []).map(({ status, afterMs }) =>
        setTimeout(() => dev.setEntitlement(status), afterMs),
      );
    });
  let launchEntitlements: ReturnType<typeof setTimeout>[] = [];
  const auth = classBackedPort('auth', identityLab.route(AuthFake(ctx), (lab) => lab.auth));
  const subscription = classBackedPort('subscription', identityLab.route(SubscriptionFake(ctx), (lab) => lab.subscription));
  const analytics = identityLab.route(AnalyticsFake(ctx), (lab) => lab.analytics);
  const onboardingOffer = createOnboardingOffer({
    subscription,
    analytics,
    identityGeneration: () => auth.identity().generation,
  });
  async function seedAccount(account: 'A' | 'B') {
    const expected = account === 'A' ? 'lab-user-a' : 'lab-user-b';
    if (accountData.snapshot().activeUserId !== expected) throw new Error(`Account ${account} is not active`);
    const day = account === 'A' ? '2026-09-01' : '2026-09-02';
    rulesStore.getState().patch({ rules: [makeRule(`account-${account.toLowerCase()}`)] });
    historyStore.getState().patch({
      startedDay: day,
      days: [{
        day,
        sealedAt: `${day}T23:59:59.000Z`,
        usageMinutes: account === 'A' ? 30 : 45,
        activity: { walking: account === 'A' ? 5000 : 7000, gym: 0 },
        met: true,
        scheduled: true,
      }],
    });
    profileStore.getState().patch({ name: `Account ${account}` });
    settingsStore.getState().patch({
      gymPlaces: [{
        id: `gym-${account.toLowerCase()}`,
        name: `Gym ${account}`,
        address: `${account} private gym`,
        latitude: 0,
        longitude: 0,
        radiusMeters: 100,
      }],
      units: account === 'A' ? 'mi' : 'km',
      stopGrace: account === 'A' ? 30 : 60,
      gymAutoDetect: account === 'B',
    });
    accountData.seedActivity?.(account);
    await Promise.all([
      rulesStore.persistBarrier(),
      historyStore.persistBarrier(),
      profileStore.persistBarrier(),
      settingsStore.persistBarrier(),
    ]);
    updateAccountDataView();
  }
  const dev: FakeRuntimeInstance['dev'] = {
      ready: () => ready,
      flush: persistence.flush,
      scenarios: scenarios.map(({ id, title }) => ({ id, title })),
      load: async (id, keepEdits = false) => {
        await ready;
        launchEntitlements.forEach(clearTimeout);
        const scenario = scenarios.find((s) => s.id === id);
        if (!scenario) throw new Error('Unknown scenario');
        ctx.update({ loading: true });
        bankDrain.reset();
        walking.stop();
        ctx.resolve(false);
        await identityLab.stop();
        await loadScenario(scenario, keepEdits);
        notificationResponses.reset();
        if (scenario.identityLab) accountData = options.createAccountData();
        ctx.scenario = scenario;
        onboardingOffer.reset();
        adAttribution.reset();
        identityLab.start();
        gait.set(scenario.gait ?? 'none');
        ctx.clock.set(scenario.clock.now, scenario.clock.timezone);
        if (!keepEdits) await gym.reset();
        ctx.update({
          stepsOverride: undefined, placement: 'propped', loading: false, scenarioId: id, outcome: 'success',
          restoreOutcome: ['trial', 'active'].includes(scenario.entitlement.status) ? 'restored' : 'notFound',
          promptMode: scenario.fakeSystemPrompts, history: scenario.history, events: [], accessibility: scenario.accessibility,
          presence: scenario.gym?.presence ?? 'outside', motion: scenario.motion ?? 'still', protectedRouteMounts: [],
          remoteFlags: scenario.remoteFlags
            ? `review preset ${scenario.remoteFlags.reviewPreset === true ? 'enabled' : 'disabled'} paywall variant ${scenario.remoteFlags.paywallVariant ?? 'control'}`
            : undefined,
          otaResume: null,
        });
        await enforcementPolicyEvidence(ctx);
        void onboardingOffer.prefetch();
        const trialReminder = trialReminderPlan(scenario.entitlement, Date.parse(ctx.clock.now()));
        ctx.update({ trialReminder: trialReminder ? `${trialReminder.title} · ${new Date(trialReminder.at).toISOString()} · ${Math.round((Date.parse(scenario.entitlement.accessExpiresAt!) - trialReminder.at) / 3600000)} hours before expiry` : 'None' });
        if (scenario.onboarding === 'complete' && !scenario.identityLab) {
          const journeyRuntime = { auth, subscription, clock: ctx.clock } as unknown as Runtime;
          if (admitPaid(journeyRuntime, false)) finishSetup(journeyRuntime);
        }
        walking.resume();
      },
      advance: ctx.clock.advance,
      advanceBankUsage: (minutes) => bankDrain.advance(minutes),
      setPresence: (presence) => ctx.update({ presence }), setMotion: (motion) => ctx.update({ motion }),
      setGait: gait.set, createGaitPreview: () => { const preview = GaitFake(true); preview.set('walking'); return preview; },
      setPlacement: (placement) => ctx.update({ placement }),
      setSteps: (value) => {
        if (!Number.isFinite(value) || value < 0) throw new Error('Invalid step count');
        ctx.update({ stepsOverride: { value: Math.floor(value), day: dayKey(ctx.clock.now(), ctx.clock.timezone()), at: ctx.clock.now() } });
      },
      setTime: ctx.clock.set, setPromptMode: (promptMode) => ctx.update({ promptMode }),
      setPermission: (name, status) => permissionsStore.getState().patch({ [name]: status }),
      setEntitlement: (status) => {
        entitlementStore.getState().patch({ entitlement: { status, renewsAt: entitlementStore.getState().data.entitlement.renewsAt } });
        noteObservedEntitlement(status);
      },
      setSession: (session) => sessionStore.getState().patch({ session }),
      setRestoreOutcome: (restoreOutcome) => ctx.update({ restoreOutcome }), setOutcome: (outcome) => ctx.update({ outcome }),
      useLabAccount: async (account) => {
        await accountData.activate(account === 'A' ? 'lab-user-a' : 'lab-user-b');
        updateAccountDataView();
      },
      seedLabAccount: seedAccount,
      runLabAccountIsolation: async () => {
        await accountData.activate('lab-user-a');
        await seedAccount('A');
        const a = `${rulesStore.getState().data.rules[0]?.id}/${historyStore.getState().data.days.length}/${profileStore.getState().data.name}/${settingsStore.getState().data.gymPlaces[0]?.name}`;
        const activityA = accountData.activityCheckpoint?.() ?? 'unavailable';
        await accountData.activate('lab-user-b');
        await seedAccount('B');
        const b = `${rulesStore.getState().data.rules[0]?.id}/${historyStore.getState().data.days.length}/${profileStore.getState().data.name}/${settingsStore.getState().data.gymPlaces[0]?.name}`;
        const activityB = accountData.activityCheckpoint?.() ?? 'unavailable';
        await accountData.activate('lab-user-a');
        updateAccountDataView();
        const restored = `${rulesStore.getState().data.rules[0]?.id}/${historyStore.getState().data.days.length}/${profileStore.getState().data.name}/${settingsStore.getState().data.gymPlaces[0]?.name}`;
        const activityRestored = accountData.activityCheckpoint?.() ?? 'unavailable';
        ctx.update({ accountData: {
          ...ctx.snapshot().accountData!,
          checkpoints: `A ${a} · B ${b} · A ${restored}`,
          activityCheckpoints: `A ${activityA} · B ${activityB} · A ${activityRestored}`,
        } });
      },
      runOnboardingPathDiagnostics: () => {
        const path = pathFor({ activity: 'walking', walkingMode: 'steps', bodyGoal: 'maintain' });
        ctx.update({ onboardingPath: path.join(' ') });
      },
      deliverNotification: (destination) => {
        notificationResponses.deliver(destination);
      },
      recordOtaResume: (route, outcome) => {
        ctx.update({ otaResume: { route, outcome } });
      },
      recordProtectedRouteMount: (route) => {
        const current = ctx.snapshot().protectedRouteMounts;
        if (!current.includes(route)) ctx.update({ protectedRouteMounts: [...current, route] });
      },
      resolvePrompt: ctx.resolve, snapshot: ctx.snapshot, subscribe: ctx.subscribe,
    };
  const runtime: FakeRuntimeInstance = {
    kind: 'fake',
    bankDrain,
    appPickerHost: FakePickerHost,
    clock: ctx.clock,
    screenTime: ScreenTimeFake(ctx),
    steps: StepsFake(ctx),
    walking,
    gait,
    gym,
    auth,
    subscription,
    analytics,
    adAttribution,
    onboardingOffer,
    reviewPreset: {
      isEnabled: async () => ctx.scenario.remoteFlags?.reviewPreset ?? false,
      expose: () => undefined,
    },
    experiments: {
      getPaywallVariant: async () => {
        const variant = ctx.scenario.remoteFlags?.paywallVariant ?? 'control';
        if (variant === 'error') throw new Error('Simulated paywall variant failure');
        return variant;
      },
      trackPaywallVariantExposure: () => undefined,
    },
    onboardingFlow: { order: () => null, load: async () => null, subscribe: () => () => undefined },
    notifications: NotificationsFake(ctx),
    notificationResponses,
    sync: SyncFake(),
    support: SupportFake(ctx),
    review: ReviewFake(ctx, options.nativeReview),
    incidentReports: IncidentReportFake(ctx),
    dataExport: {
      requestShare: async (buildPayload) => {
        const payload = await buildPayload();
        ctx.log('export_requested', {
          rules: payload.rules.length,
          days: payload.days.length,
          earnedUnlocks: payload.earnedUnlocks.length,
          visits: payload.visits.length,
        });
      },
    },
    status: { ready: () => ready, flush: async () => { await gym.flush(); await persistence.flush(); }, snapshot: ctx.snapshot, subscribe: ctx.subscribe },
    dev,
    dispose: () => {
      stopBankEvidence();
      void identityLab.stop();
      activity.dispose();
      persistence.dispose();
      walking.disconnect();
      void gait.stop();
      gym.dispose();
      ctx.dispose();
    },
  };
  const stopBankEvidence = startFakeBankEvidence(runtime);
  return runtime;
}

