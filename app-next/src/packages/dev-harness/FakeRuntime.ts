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
import { isAccountDataReady } from '../model/accountDataReady';
import { NotificationResponsesFake } from './lib/fakes/NotificationResponsesFake';
import { admitPaid, beginWelcome, currentJourney, eligible, finishSetup } from '../journey/index';
import { rememberSignIn } from '../identity/rememberedSignIn';
import { pathFor } from '../onboarding/onboardingPath';
import { classBackedPort } from './lib/fakes/classBackedPort';
import { enforcementPolicyEvidence } from './lib/enforcementPolicyEvidence';
export type FakeRuntimeInstance = Runtime & { kind: 'fake'; dev: NonNullable<Runtime['dev']> };
export type FakeRuntimeOptions = {
  gymFixSource?: () => Promise<GymLocationFix | null>;
  nativeReview?: Runtime['review'];
  createAccountData(): {
    prepare(): Promise<void>;
    deactivate(): Promise<void>;
    eraseActive(): Promise<void>;
    activate(userId: string): Promise<{ changedAccount: boolean }>;
    snapshot(): { activeUserId: string | null; legacyQuarantined: boolean };
    seedActivity?(account: 'A' | 'B'): void;
    activityCheckpoint?(): string;
  };
};
export function FakeRuntime(options: FakeRuntimeOptions): FakeRuntimeInstance {
  let accountData = options.createAccountData();
  let accountTransitions: string[] = [];
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
      userId === 'lab-user-a' ? 'A' as const : userId === 'lab-user-b' ? 'B' as const : userId ? 'Checkout' as const : 'None' as const,
    updateAccountDataView = () => {
      const snapshot = accountData.snapshot();
      ctx.update({ accountData: {
        active: accountLabel(snapshot.activeUserId),
        legacyQuarantined: snapshot.legacyQuarantined,
        checkpoints: ctx.snapshot().accountData?.checkpoints,
        switchOrdering: ctx.snapshot().accountData?.switchOrdering,
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
      beforeAccountSwitch: async () => {
        await settleBankDrain(bankDrain);
        await accountData.deactivate();
        accountTransitions.push('Preserved while unready');
        updateAccountDataView();
      },
      prepareAccount: async (identity) => {
        if (!identity.userId) throw new Error('Account identity is missing');
        const transition = await accountData.activate(identity.userId);
        accountTransitions.push(`${accountLabel(identity.userId)} loaded before ready`);
        if (transition.changedAccount) accountTransitions.push('Screen Time rotated after target loaded');
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
  const paidNow = () => eligible(subscription.entitlement(), Date.parse(ctx.clock.now()));
  const subscriptionAdmission = {
    verify: async (_identity: { userId: string; generation: number }) => ({ type: paidNow() ? 'eligible' as const : 'ineligible' as const }),
  };
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
        if (scenario.onboarding === 'complete' && !scenario.launchSignInRequired && !scenario.identityLab) {
          if (auth.identity().kind !== 'canonical') await auth.signInWithApple();
          rememberSignIn(auth.identity());
          const journeyRuntime = { auth, subscription } as unknown as Runtime;
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
      runLabAccountSwitchOrdering: async () => {
        const waitForReady = async () => {
          const current = auth.identity();
          if (isAccountDataReady(current, accountData.snapshot().activeUserId)) return current;
          return new Promise<ReturnType<typeof auth.identity>>((resolve, reject) => {
            const timer = setTimeout(() => {
              stop();
              reject(new Error('Account switch did not become ready'));
            }, 15_000);
            const stop = auth.subscribeIdentity((identity) => {
              if (!isAccountDataReady(identity, accountData.snapshot().activeUserId)) return;
              clearTimeout(timer);
              stop();
              resolve(identity);
            });
          });
        };
        await auth.recoverWithApple();
        await waitForReady();
        await seedAccount('A');
        accountTransitions = [];
        await auth.recoverWithGoogle();
        const b = await waitForReady();
        accountTransitions.push(`${accountLabel(b.userId)} ready`);
        await seedAccount('B');
        await auth.recoverWithApple();
        const a = await waitForReady();
        accountTransitions.push(`${accountLabel(a.userId)} ready`);
        updateAccountDataView();
        ctx.update({ accountData: {
          ...ctx.snapshot().accountData!,
          switchOrdering: accountTransitions.join(' · '),
        } });
      },
      runLabDelayedCallbackIsolation: async () => {
        const result = await identityLab.runDelayedCallbackIsolation();
        const selected = auth.identity();
        const admission = selected.kind === 'canonical' && selected.userId
          ? await subscriptionAdmission.verify({ userId: selected.userId, generation: selected.generation })
          : { type: 'unavailable' as const };
        const current = ctx.snapshot().subscriptionLab;
        ctx.update({ subscriptionLab: {
          purchases: current?.purchases ?? 0,
          restores: current?.restores ?? 0,
          queued: current?.queued ?? 0,
          delivered: current?.delivered ?? 0,
          callbackIsolation: `${result.identity} Entitlement ${result.entitlement} admission ${admission.type} callbacks ${result.queued}/${result.delivered}`,
        } });
      },
      prepareLabDeletionCallbackIsolation: async () => {
        await identityLab.prepareDeletionCallbackIsolation(() => seedAccount('A'), async (result) => {
          const selected = auth.identity();
          const admission = selected.kind === 'canonical' && selected.userId
            ? await subscriptionAdmission.verify({ userId: selected.userId, generation: selected.generation })
            : { type: 'unavailable' as const };
          const accountDataErased =
            rulesStore.getState().data.rules.length === 0 &&
            historyStore.getState().data.days.length === 0 &&
            profileStore.getState().data.name.length === 0 &&
            settingsStore.getState().data.gymPlaces.length === 0;
          const current = ctx.snapshot().subscriptionLab;
          ctx.update({ subscriptionLab: {
            purchases: current?.purchases ?? 0,
            restores: current?.restores ?? 0,
            queued: current?.queued ?? 0,
            delivered: current?.delivered ?? 0,
            callbackIsolation: current?.callbackIsolation,
            deletionIsolation: `${result.deletedIdentity} deleted tombstone ${result.tombstonePreserved ? 'preserved' : 'missing'} fresh ${result.identity} Entitlement ${result.entitlement} admission ${admission.type} data ${accountDataErased ? 'erased' : 'present'} callbacks ${result.queued}/${result.delivered}`,
            transferIsolation: current?.transferIsolation,
            concurrentRestoreIsolation: current?.concurrentRestoreIsolation,
          } });
        });
      },
      runLabDeletionCallbackIsolation: async () => {
        const result = await identityLab.runDeletionCallbackIsolation(() => seedAccount('A'));
        const selected = auth.identity();
        const admission = selected.kind === 'canonical' && selected.userId
          ? await subscriptionAdmission.verify({ userId: selected.userId, generation: selected.generation })
          : { type: 'unavailable' as const };
        const accountDataErased =
          rulesStore.getState().data.rules.length === 0 &&
          historyStore.getState().data.days.length === 0 &&
          profileStore.getState().data.name.length === 0 &&
          settingsStore.getState().data.gymPlaces.length === 0;
        const current = ctx.snapshot().subscriptionLab;
        ctx.update({ subscriptionLab: {
          purchases: current?.purchases ?? 0,
          restores: current?.restores ?? 0,
          queued: current?.queued ?? 0,
          delivered: current?.delivered ?? 0,
          callbackIsolation: current?.callbackIsolation,
          deletionIsolation: `${result.deletedIdentity} deleted tombstone ${result.tombstonePreserved ? 'preserved' : 'missing'} fresh ${result.identity} Entitlement ${result.entitlement} admission ${admission.type} data ${accountDataErased ? 'erased' : 'present'} callbacks ${result.queued}/${result.delivered}`,
          transferIsolation: current?.transferIsolation,
          concurrentRestoreIsolation: current?.concurrentRestoreIsolation,
        } });
      },
      runLabEstablishedTransfer: async () => {
        const verifyCurrent = async () => {
          const selected = auth.identity();
          if (selected.kind !== 'canonical' || !selected.userId) return 'unavailable';
          const proof = await subscriptionAdmission.verify({ userId: selected.userId, generation: selected.generation });
          return proof.type;
        };
        const result = await identityLab.runEstablishedTransfer(seedAccount, accountCheckpoint, verifyCurrent);
        const current = ctx.snapshot().subscriptionLab;
        ctx.update({ subscriptionLab: {
          purchases: current?.purchases ?? 0,
          restores: current?.restores ?? result.restores,
          queued: current?.queued ?? 0,
          delivered: current?.delivered ?? 0,
          callbackIsolation: current?.callbackIsolation,
          deletionIsolation: current?.deletionIsolation,
          transferIsolation: `${result.source} source profile ${result.beforeTransfer} retry ${result.afterFailure} transfer ${result.afterTransfer} repeat ${result.afterRepeat} source after ${result.sourceAfterTransfer} target return ${result.targetAfterReturn} transfers ${result.transfers}${result.grantLedger ? ` grants ${result.grantLedger}` : ''} data A ${result.sourceData} data B ${result.targetData}`,
          concurrentRestoreIsolation: current?.concurrentRestoreIsolation,
          providerConflict: current?.providerConflict,
        } });
      },
      runLabConcurrentRestore: async () => {
        const verifyCurrent = async () => {
          const selected = auth.identity();
          if (selected.kind !== 'canonical' || !selected.userId) return 'unavailable';
          const proof = await subscriptionAdmission.verify({ userId: selected.userId, generation: selected.generation });
          return proof.type;
        };
        const result = await identityLab.runConcurrentRestore(seedAccount, accountCheckpoint, verifyCurrent);
        const current = ctx.snapshot().subscriptionLab;
        ctx.update({ subscriptionLab: {
          purchases: current?.purchases ?? 0,
          restores: current?.restores ?? result.restores,
          queued: current?.queued ?? 0,
          delivered: current?.delivered ?? 0,
          callbackIsolation: current?.callbackIsolation,
          deletionIsolation: current?.deletionIsolation,
          transferIsolation: current?.transferIsolation,
          concurrentRestoreIsolation: `race A+B winner ${result.winner} after race ${result.afterRace} stale loser ${result.afterStaleLoser} repeat ${result.afterRepeat} source ${result.sourceAfterRace} target ${result.targetAfterReturn} transfers ${result.transfers} grants ${result.grantLedger} data A ${result.sourceData} data B ${result.targetData}`,
          providerConflict: current?.providerConflict,
        } });
      },
      runLabProviderLinking: async () => {
        const result = await identityLab.runProviderLinking(seedAccount, accountCheckpoint);
        const current = ctx.snapshot().subscriptionLab;
        ctx.update({ subscriptionLab: {
          purchases: current?.purchases ?? 0,
          restores: current?.restores ?? 0,
          queued: current?.queued ?? 0,
          delivered: current?.delivered ?? 0,
          callbackIsolation: current?.callbackIsolation,
          deletionIsolation: current?.deletionIsolation,
          transferIsolation: current?.transferIsolation,
          concurrentRestoreIsolation: current?.concurrentRestoreIsolation,
          providerLinking: `canonical ${result.canonical} Apple ${result.apple} Google ${result.google} accounts ${result.accounts} grants ${result.grants} conflict ${result.conflict} data A ${result.initialData} data Apple ${result.appleData} data Google ${result.googleData} data conflict ${result.conflictData}`,
          providerConflict: current?.providerConflict,
          localSignOutIsolation: current?.localSignOutIsolation,
        } });
      },
      runLabLocalSignOut: async () => {
        const journeyRuntime = { auth, subscription } as unknown as Runtime;
        const journeyCheckpoint = async (action?: 'admit' | 'reset') => {
          if (action === 'reset') beginWelcome();
          else if (action === 'admit') {
            if (!admitPaid(journeyRuntime, false) || !finishSetup(journeyRuntime)) throw new Error('Journey admission was not established');
          }
          const journey = currentJourney();
          const admitted = journey.phase === 'app' && paidNow();
          return `${journey.phase}/${admitted ? 'admitted' : 'revoked'}`;
        };
        const result = await identityLab.runLocalSignOut(seedAccount, accountCheckpoint, journeyCheckpoint);
        const current = ctx.snapshot().subscriptionLab;
        ctx.update({ subscriptionLab: {
          purchases: current?.purchases ?? 0,
          restores: current?.restores ?? 0,
          queued: current?.queued ?? 0,
          delivered: current?.delivered ?? 0,
          callbackIsolation: current?.callbackIsolation,
          deletionIsolation: current?.deletionIsolation,
          transferIsolation: current?.transferIsolation,
          concurrentRestoreIsolation: current?.concurrentRestoreIsolation,
          providerConflict: current?.providerConflict,
          localSignOutIsolation: `before ${result.before} failed reset ${result.failedReset} after ${result.after} local scopes ${result.localScopes} local data ${result.localData} peer ${result.peer} fresh proofs ${result.peerProofs}`,
        } });
      },
      runLabStaleProductHandle: async () => {
        const result = await identityLab.runStaleProductHandle(seedAccount, accountCheckpoint);
        const current = ctx.snapshot().subscriptionLab;
        ctx.update({ subscriptionLab: {
          purchases: current?.purchases ?? result.purchaseCalls,
          restores: current?.restores ?? 0,
          queued: current?.queued ?? 0,
          delivered: current?.delivered ?? 0,
          staleProductHandle: `source ${result.source} generation ${result.sourceGeneration} target ${result.target} generation ${result.targetGeneration} stale ${result.staleError} SDK purchases ${result.purchaseCalls} data A ${result.sourceData} data B ${result.targetData} A restored ${result.sourceRestored}`,
        } });
      },
      runLabIndependentRestore: async () => {
        const verifyCurrent = async () => {
          const selected = auth.identity();
          if (selected.kind !== 'canonical' || !selected.userId) return 'unavailable';
          const proof = await subscriptionAdmission.verify({ userId: selected.userId, generation: selected.generation });
          return proof.type;
        };
        const result = await identityLab.runIndependentRestore(seedAccount, accountCheckpoint, verifyCurrent);
        const current = ctx.snapshot().subscriptionLab;
        ctx.update({ subscriptionLab: {
          purchases: current?.purchases ?? 0,
          restores: current?.restores ?? result.restores,
          queued: current?.queued ?? 0,
          delivered: current?.delivered ?? 0,
          restoreIsolation: `independent before ${result.before} empty restore after ${result.after} Entitlement ${result.entitlement} restores ${result.restores} data ${result.data}`,
        } });
      },
      runLabPassiveEntry: async () => {
        const result = await identityLab.runPassiveEntry(seedAccount, accountCheckpoint);
        const current = ctx.snapshot().subscriptionLab;
        ctx.update({ subscriptionLab: {
          purchases: current?.purchases ?? 0,
          restores: current?.restores ?? result.restores,
          queued: current?.queued ?? 0,
          delivered: current?.delivered ?? 0,
          passiveEntry: `store owner ${result.owner} passive target ${result.passiveTarget} target Entitlement ${result.targetEntitlement} source Entitlement ${result.sourceEntitlement} transfers ${result.transfers} restores ${result.restores} data A ${result.sourceData} data B ${result.targetData} A restored ${result.sourceRestored}`,
        } });
      },
      runLabLifecycleRevocation: async () => {
        const journeyRuntime = { auth, subscription } as unknown as Runtime;
        const journeyCheckpoint = async (action: 'admit' | 'refresh') => {
          if (action === 'admit') {
            if (!admitPaid(journeyRuntime, false) || !finishSetup(journeyRuntime)) throw new Error('Journey admission was not established');
          } else await subscription.refresh();
          const journey = currentJourney();
          const admitted = journey.phase === 'app' && paidNow();
          return `${journey.phase}/${admitted ? 'admitted' : 'revoked'}`;
        };
        const result = await identityLab.runLifecycleRevocation(seedAccount, accountCheckpoint, journeyCheckpoint);
        const current = ctx.snapshot().subscriptionLab;
        ctx.update({ subscriptionLab: {
          purchases: current?.purchases ?? 0,
          restores: current?.restores ?? 0,
          queued: current?.queued ?? 0,
          delivered: current?.delivered ?? 0,
          lifecycleRevocation: `before ${result.before} after ${result.after} Entitlement ${result.entitlement} data ${result.data}`,
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

