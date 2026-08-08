import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import {
  aboutCopy,
  aboutDetailCopy,
  appleHealthCopy,
  cancellationFlow,
  connectionsCopy,
  generalSettingsOptions,
  generalSettingsRows,
  getSubscriptionPresentation,
  manageDataCopy,
  paywallPlans,
  restoreFixtures,
  settingsRootCopy,
  shortcutFixtures,
  shortcutsDisclosure,
  subscriptionRows,
  whatsNewCopy,
  type PermissionDetailId,
} from '@/content';
import {
  AccessibleModal,
  AccessibleModalTitle,
  PillowCard,
  PillButton,
  PressableScale,
  SettingsRow,
  colors,
  motion,
  radius,
  space,
  type,
} from '@/design-system';
import {
  AboutPermissionsScreen,
  AccountScreen,
  NotificationSettingsScreen,
  PermissionsScreen,
  RatePreviewScreen,
  ReviewPromptScreen,
  SimulatedShareSheet,
  SettingsDetailScreen,
  type SettingsDetailSection,
  type PermissionPreviewStatus,
} from '@/features/settings';
import {
  useDemo,
  type DemoState,
  type ReviewPromptState,
  type ReviewTrigger,
  type SubscriptionStatus,
} from '@/presentation';

type ReviewPhase = 'rate' | 'prompt' | 'fixture' | 'complete';
type SettingsOverlay =
  | 'subscription-cancel-reason'
  | 'subscription-winback'
  | 'subscription-confirm'
  | 'subscription-cancelled'
  | 'subscription-kept'
  | 'subscription-subscribe'
  | 'subscription-subscribed'
  | 'subscription-learn'
  | 'subscription-redeem'
  | 'restore-choice'
  | 'restore-loading'
  | 'restore-restored'
  | 'restore-none'
  | 'shortcut-add'
  | 'shortcut-remove'
  | 'shortcut-added'
  | 'shortcut-removed'
  | 'data-export-ready'
  | 'data-share'
  | 'data-reset'
  | 'data-reset-done'
  | 'data-delete'
  | 'day-boundary'
  | 'health-disconnect'
  | 'health-reconnect'
  | 'health-diagnostics'
  | 'language-settings'
  | null;

const reviewFixtureStates: Record<string, ReviewPromptState> = {
  eligible: 'eligible',
  presented: 'presented',
  dismissed: 'dismissed',
  rated: 'rated',
  suppressed: 'suppressedAfterShield',
  stopped: 'stoppedAfterThree',
};

const reviewTriggers: readonly ReviewTrigger[] = ['fifthUnlock', 'sevenDays', 'thirtyDays'];
const appearanceLabels: Record<DemoState['settings']['appearance'], string> = { auto: 'Auto', light: 'Light', dark: 'Dark' };
const appearanceValues: Record<string, DemoState['settings']['appearance']> = { Auto: 'auto', Light: 'light', Dark: 'dark' };
const startWeekLabels: Record<DemoState['settings']['startWeek'], string> = { device: 'Use device setting', sunday: 'Sunday', monday: 'Monday' };
const startWeekValues: Record<string, DemoState['settings']['startWeek']> = { 'Use device setting': 'device', Sunday: 'sunday', Monday: 'monday' };
const unitLabels: Record<DemoState['settings']['units'], string> = { miles: 'Miles', kilometers: 'Kilometers' };
const unitValues: Record<string, DemoState['settings']['units']> = { Miles: 'miles', Kilometers: 'kilometers' };
const customBoundaryValues: readonly Exclude<DemoState['settings']['dayBoundary'], 'midnight'>[] = ['2:00 AM', '3:00 AM', '4:00 AM', '5:00 AM'];

export default function SettingsDetailRoute() {
  const { fixture, recovered, section = 'general', trigger } = useLocalSearchParams<{
    fixture?: string;
    recovered?: string;
    section?: string;
    trigger?: string;
  }>();
  const router = useRouter();
  const { state, dispatch } = useDemo();
  const fixtureReviewState = fixture ? reviewFixtureStates[fixture] : undefined;
  const fixtureReviewTrigger = reviewTriggers.includes(trigger as ReviewTrigger)
    ? trigger as ReviewTrigger
    : state.review.eligibleTrigger;
  const [reviewPhase, setReviewPhase] = useState<ReviewPhase>(
    section !== 'review'
      ? 'rate'
      : fixtureReviewState === 'rated'
        ? 'complete'
        : fixtureReviewState && fixtureReviewState !== 'presented'
          ? 'fixture'
          : 'prompt',
  );
  const [stars, setStars] = useState<number | null>(null);
  const [notice, setNotice] = useState('Saved only in this demo.');
  const [overlay, setOverlay] = useState<SettingsOverlay>(null);
  const [selectedCancelReason, setSelectedCancelReason] = useState<string | null>(null);
  const [pendingShortcutId, setPendingShortcutId] = useState<keyof DemoState['settings']['shortcuts']>('walking');
  const [restoreOutcome, setRestoreOutcome] = useState<'restored' | 'none'>('none');
  const [exportKind, setExportKind] = useState<'activity' | 'conditions'>('activity');
  const [aboutShareVisible, setAboutShareVisible] = useState(false);
  const [aboutShareDestination, setAboutShareDestination] = useState<string | null>(null);
  const aboutFooterTaps = useRef(0);
  const [boundaryDraft, setBoundaryDraft] = useState<Exclude<DemoState['settings']['dayBoundary'], 'midnight'>>(
    state.settings.dayBoundary === 'midnight' ? '4:00 AM' : state.settings.dayBoundary,
  );

  useEffect(() => {
    if (overlay !== 'restore-loading') return;
    const timer = setTimeout(
      () => setOverlay(restoreOutcome === 'restored' ? 'restore-restored' : 'restore-none'),
      550,
    );
    return () => clearTimeout(timer);
  }, [overlay, restoreOutcome]);

  if (section === 'permissions') {
    const statusFor = (outcome: DemoState['onboarding']['permissionOutcomes']['screenTime']): PermissionPreviewStatus =>
      outcome === 'allowed' ? 'healthy' : outcome === 'denied' ? 'attention' : 'notAsked';
    const forceHealthy = state.settings.permissionHealth === 'healthy';
    const statuses = {
      screenTime: forceHealthy ? 'healthy' : statusFor(state.onboarding.permissionOutcomes.screenTime),
      location: forceHealthy ? 'healthy' : statusFor(state.onboarding.permissionOutcomes.location),
      motion: forceHealthy ? 'healthy' : statusFor(state.onboarding.permissionOutcomes.motion),
      health: forceHealthy ? 'healthy' : statusFor(state.onboarding.permissionOutcomes.health),
      notifications: forceHealthy ? 'healthy' : statusFor(state.settings.notificationPermissionOutcome),
    } satisfies Record<PermissionDetailId, PermissionPreviewStatus>;
    return (
      <PermissionsScreen
        onBack={() => router.back()}
        onOpenAbout={() => router.push('/settings/about-permissions')}
        onOpenPermission={(permission) => router.push(`/settings/permission/${permission}` as Href)}
        statuses={statuses}
      />
    );
  }

  if (section === 'about-permissions') return <AboutPermissionsScreen onBack={() => router.back()} />;

  if (section === 'account') {
    return (
      <AccountScreen
        onBack={() => router.back()}
        onDeletePreview={() => dispatch({ type: 'account/sign-out' })}
        onSignIn={() => router.push('/signup?mode=recovery&returnTo=account')}
        onSignOutPreview={() => dispatch({ type: 'account/sign-out' })}
        recovered={recovered === '1'}
        signedIn={state.account.status === 'signedInDemo'}
      />
    );
  }

  if (section === 'notifications') {
    return (
      <NotificationSettingsScreen
        nudgeTime={state.settings.nudgeTime}
        onBack={() => router.back()}
        onOpenNudgeTime={() => router.push('/settings/nudge-time')}
        onPermissionPreviewed={(value) => dispatch({ type: 'settings/set-notification-permission-outcome', value })}
        onToggle={(kind, enabled) => dispatch({ type: 'settings/set-notification-kind', kind, value: enabled })}
        permissionPreviewed={state.settings.notificationPermissionPreviewed}
        values={state.settings.notificationChoices}
      />
    );
  }

  if (section === 'rate' || section === 'review') {
    if (reviewPhase === 'rate') {
      return (
        <RatePreviewScreen
          onBack={() => router.back()}
          onNotNow={() => router.back()}
          onOpenPrompt={() => {
            dispatch({ type: 'review/open-manual-rate' });
            setReviewPhase('prompt');
          }}
        />
      );
    }
    const visibleReviewState: ReviewPromptState = reviewPhase === 'complete'
      ? 'rated'
      : reviewPhase === 'prompt'
        ? 'presented'
        : fixtureReviewState ?? state.review.prompt;
    return (
      <ReviewPromptScreen
        complete={reviewPhase === 'complete'}
        fixtureState={visibleReviewState}
        onDismiss={() => {
          dispatch({ type: 'review/dismiss' });
          router.back();
        }}
        onDone={() => router.back()}
        onSelectStars={setStars}
        onSubmit={() => {
          dispatch({ type: 'review/rate' });
          setReviewPhase('complete');
        }}
        stars={stars}
        trigger={fixtureReviewTrigger}
      />
    );
  }

  const detail = makeDetail(section, state.settings, state.selectedPlan);

  const handleRow = (rowId: string) => {
    if (section === 'subscription') {
      if (rowId === 'change-or-cancel-subscription') {
        setSelectedCancelReason(null);
        setOverlay(state.settings.subscriptionStatus === 'cancelled' ? 'subscription-subscribe' : 'subscription-cancel-reason');
        return;
      }
      if (rowId === 'restore-purchases') {
        setOverlay('restore-choice');
        return;
      }
      if (rowId === 'redeem-code') {
        setOverlay('subscription-redeem');
        return;
      }
      if (rowId === 'learn-more') {
        setOverlay('subscription-learn');
        return;
      }
    }

    if (section === 'appearance' && appearanceValues[rowId]) {
      dispatch({ type: 'settings/set-appearance', value: appearanceValues[rowId] });
      setNotice(`Appearance preview crossfaded to ${rowId}. Orange remains the brand color.`);
      return;
    }
    if (section === 'units' && unitValues[rowId]) {
      dispatch({ type: 'settings/set-units', value: unitValues[rowId] });
      setNotice(`${rowId} saved for sample distance labels.`);
      return;
    }
    if (section === 'start-week' && startWeekValues[rowId]) {
      dispatch({ type: 'settings/set-start-week', value: startWeekValues[rowId] });
      setNotice(`${rowId} saved for the sample Analysis calendar.`);
      return;
    }
    if (section === 'nudge-time' && ['2:00 PM', '3:00 PM', '4:00 PM'].includes(rowId)) {
      dispatch({ type: 'settings/set-nudge-time', value: rowId as DemoState['settings']['nudgeTime'] });
      setNotice(`${rowId} saved for the local nudge preview. Nothing is scheduled.`);
      return;
    }
    if (section === 'language' && rowId === 'open-settings-preview') {
      setOverlay('language-settings');
      return;
    }
    if (section === 'day-boundary') {
      if (rowId === 'Off · Midnight') {
        dispatch({ type: 'settings/set-day-boundary', value: 'midnight' });
        setNotice('Midnight day boundary saved.');
      } else if (rowId === 'Custom') {
        setBoundaryDraft(state.settings.dayBoundary === 'midnight' ? '4:00 AM' : state.settings.dayBoundary);
        setOverlay('day-boundary');
      }
      return;
    }
    if (section === 'shortcuts') {
      const shortcutId = rowId as keyof DemoState['settings']['shortcuts'];
      if (!(shortcutId in state.settings.shortcuts)) return;
      setPendingShortcutId(shortcutId);
      setOverlay(state.settings.shortcuts[shortcutId] ? 'shortcut-remove' : 'shortcut-add');
      return;
    }
    if (section === 'data') {
      if (rowId === 'activity' || rowId === 'conditions') {
        setExportKind(rowId);
        setOverlay('data-export-ready');
      } else if (rowId === 'reset') {
        setOverlay('data-reset');
      } else if (rowId === 'delete') {
        setOverlay('data-delete');
      }
      return;
    }
    if (section === 'apple-health') {
      if (rowId === 'diagnostics') {
        setOverlay('health-diagnostics');
        return;
      }
      if (rowId === 'health-connection') {
        setOverlay(state.settings.healthConnected ? 'health-disconnect' : 'health-reconnect');
        return;
      }
    }
    if (section === 'about' && rowId === 'share') {
      setAboutShareDestination(null);
      setAboutShareVisible(true);
      return;
    }

    const route = routeForRow(section, rowId);
    if (route) {
      if (rowId === 'rate') dispatch({ type: 'review/open-manual-rate' });
      router.push(route as Href);
      return;
    }
    setNotice(`${rowId.replaceAll('-', ' ')} preview selected. Nothing opened or changed outside this demo.`);
  };

  const closeOverlay = () => setOverlay(null);
  const shortcut = shortcutFixtures.find((item) => item.id === pendingShortcutId) ?? shortcutFixtures[0];

  const modalContent = (): ReactNode => {
    switch (overlay) {
      case 'subscription-cancel-reason':
        return (
          <>
            <ModalHeader body={cancellationFlow.body} eyebrow="LOCAL CANCELLATION PREVIEW" title={cancellationFlow.title} />
            <View style={styles.optionList}>
              {cancellationFlow.reasons.map((reason) => (
                <PillButton key={reason} fullWidth label={reason} onPress={() => setSelectedCancelReason(reason)} variant={selectedCancelReason === reason ? 'dark' : 'secondary'} />
              ))}
            </View>
            <PillButton disabled={!selectedCancelReason} fullWidth label="Continue" onPress={() => setOverlay('subscription-winback')} variant="dark" />
            <PillButton fullWidth label="Back" onPress={closeOverlay} variant="text" />
          </>
        );
      case 'subscription-winback':
        return (
          <>
            <ModalHeader body={cancellationFlow.winBack.body} eyebrow={cancellationFlow.winBack.eyebrow} title={cancellationFlow.winBack.title} />
            <Text style={styles.modalNote}>{cancellationFlow.winBack.renewal}</Text>
            <PillButton
              fullWidth
              label={cancellationFlow.winBack.primary}
              onPress={() => {
                dispatch({ type: 'paywall/select-plan', plan: 'annual' });
                dispatch({ type: 'settings/set-subscription-offer', offer: 'annual-winback' });
                dispatch({ type: 'settings/set-subscription', status: 'active' });
                setOverlay('subscription-kept');
              }}
              variant="dark"
            />
            <PillButton fullWidth label={cancellationFlow.winBack.secondary} onPress={() => setOverlay('subscription-confirm')} variant="text" />
          </>
        );
      case 'subscription-confirm':
        return (
          <>
            <ModalHeader
              body={state.settings.subscriptionStatus === 'trial'
                ? cancellationFlow.confirmation.trialBody
                : state.selectedPlan === 'monthly'
                  ? cancellationFlow.confirmation.monthlyBody
                  : cancellationFlow.confirmation.activeBody}
              eyebrow="LOCAL CONFIRMATION"
              title={cancellationFlow.confirmation.title}
            />
            <PillButton fullWidth label={cancellationFlow.confirmation.actions[0]} onPress={closeOverlay} variant="dark" />
            <PillButton
              fullWidth
              label={cancellationFlow.confirmation.actions[1]}
              onPress={() => {
                dispatch({ type: 'settings/set-subscription', status: 'cancelled' });
                setOverlay('subscription-cancelled');
              }}
              variant="destructive"
            />
          </>
        );
      case 'subscription-cancelled':
        return <ResultContent body={cancellationFlow.result.body} onDone={closeOverlay} title={cancellationFlow.result.title} />;
      case 'subscription-kept':
        return <ResultContent body="The lower-price sample was selected. No App Store subscription changed." onDone={closeOverlay} title="Premium kept in this demo" />;
      case 'subscription-subscribe':
        return (
          <>
            <ModalHeader body="Choose a local plan to restart the cancelled sample. Nothing is charged." eyebrow="SIMULATED APP STORE SHEET" title="Subscribe again" />
            {paywallPlans.map((plan) => (
              <PillButton
                key={plan.id}
                fullWidth
                label={`${plan.label} · ${plan.price}`}
                onPress={() => {
                  dispatch({ type: 'paywall/select-plan', plan: plan.id });
                  dispatch({ type: 'settings/set-subscription', status: 'active' });
                  setOverlay('subscription-subscribed');
                }}
                variant="dark"
              />
            ))}
            <PillButton fullWidth label="Cancel" onPress={closeOverlay} variant="text" />
          </>
        );
      case 'subscription-subscribed':
        return <ResultContent body="The active subscription fixture is restored locally. No charge was made." onDone={closeOverlay} title="Subscribed in demo" />;
      case 'subscription-learn':
        return <ResultContent body="One shared balance, movement-based conditions, Analysis, schedules, and clear recovery previews are included." onDone={closeOverlay} title="ExcerLock Premium" />;
      case 'subscription-redeem':
        return <ResultContent body="This is the simulated App Store redeem-code handoff. No system sheet or code service opened." onDone={closeOverlay} title="Redeem code preview" />;
      case 'restore-choice':
        return (
          <>
            <ModalHeader body="Choose the deterministic local result. No receipt or App Store account is checked." eyebrow="RESTORE PREVIEW" title="Restore purchases" />
            <PillButton fullWidth label="Preview restored purchase" onPress={() => { setRestoreOutcome('restored'); setOverlay('restore-loading'); }} variant="dark" />
            <PillButton fullWidth label="Preview nothing to restore" onPress={() => { setRestoreOutcome('none'); setOverlay('restore-loading'); }} variant="secondary" />
            <PillButton fullWidth label="Cancel" onPress={closeOverlay} variant="text" />
          </>
        );
      case 'restore-loading':
        return (
          <>
            <ModalHeader body={restoreFixtures.loading.body} eyebrow="LOCAL RESTORE PREVIEW" title={restoreFixtures.loading.title} />
            <PillButton fullWidth label="Checking sample purchases" loading onPress={() => undefined} variant="dark" />
            <PillButton fullWidth label={restoreFixtures.loading.action} onPress={closeOverlay} variant="text" />
          </>
        );
      case 'restore-restored':
        return (
          <ResultContent
            body={restoreFixtures.restored.body}
            onDone={() => {
              dispatch({ type: 'settings/set-subscription', status: 'active' });
              closeOverlay();
            }}
            title={restoreFixtures.restored.title}
          />
        );
      case 'restore-none':
        return <ResultContent body={restoreFixtures.none.body} onDone={closeOverlay} title={restoreFixtures.none.title} />;
      case 'shortcut-add':
        return (
          <>
            <ModalHeader body={shortcutsDisclosure} eyebrow="SIMULATED ADD TO SIRI SHEET" title={shortcut.title} />
            <PillowCard variant="strong"><Text style={styles.darkTitle}>“{shortcut.phrase}”</Text></PillowCard>
            <PillButton
              fullWidth
              label="Add shortcut in demo"
              onPress={() => {
                dispatch({ type: 'settings/set-shortcut', shortcutId: pendingShortcutId, value: true });
                setOverlay('shortcut-added');
              }}
              variant="dark"
            />
            <PillButton fullWidth label="Cancel" onPress={closeOverlay} variant="text" />
          </>
        );
      case 'shortcut-remove':
        return (
          <>
            <ModalHeader body="The local Added label will return to Add. No Siri shortcut is removed." eyebrow="LOCAL CONFIRMATION" title={`Remove ${shortcut.title}?`} />
            <PillButton
              fullWidth
              label="Remove in demo"
              onPress={() => {
                dispatch({ type: 'settings/set-shortcut', shortcutId: pendingShortcutId, value: false });
                setOverlay('shortcut-removed');
              }}
              variant="destructive"
            />
            <PillButton fullWidth label="Keep shortcut" onPress={closeOverlay} variant="text" />
          </>
        );
      case 'shortcut-added':
        return <ResultContent body="The shortcut is marked Added only in this demo." onDone={closeOverlay} title="Shortcut added" />;
      case 'shortcut-removed':
        return <ResultContent body="The shortcut is marked Add again. No Siri data changed." onDone={closeOverlay} title="Shortcut removed" />;
      case 'data-export-ready':
        return (
          <>
            <ModalHeader body={manageDataCopy.exportResult.body} eyebrow="LOCAL JSON EXPORT" title={manageDataCopy.exportResult.title} />
            <Text style={styles.modalNote}>{exportKind === 'activity' ? 'Activity ledger sample' : `${state.conditions.length} local conditions`}</Text>
            <PillButton fullWidth label={manageDataCopy.exportResult.primary} onPress={() => setOverlay('data-share')} variant="dark" />
            <PillButton fullWidth label={manageDataCopy.exportResult.secondary} onPress={closeOverlay} variant="text" />
          </>
        );
      case 'data-share':
        return (
          <>
            <ModalHeader body="No share extension opened and no file was created." eyebrow="SIMULATED SHARE SHEET" title="Share export preview" />
            <View style={styles.jsonPreview}><Text style={styles.jsonText}>{exportKind === 'activity' ? '{ "activeDays": 5, "earns": 7 }' : `{ "conditions": ${state.conditions.length} }`}</Text></View>
            <PillButton fullWidth label="Done" onPress={closeOverlay} variant="dark" />
          </>
        );
      case 'data-reset':
        return (
          <>
            <ModalHeader body={manageDataCopy.resetAlert.body} eyebrow="LOCAL CONFIRMATION" title={manageDataCopy.resetAlert.title} />
            <PillButton
              fullWidth
              label={manageDataCopy.resetAlert.actions[1]}
              onPress={() => {
                dispatch({ type: 'debug/seed-showcase' });
                setOverlay('data-reset-done');
              }}
              variant="destructive"
            />
            <PillButton fullWidth label={manageDataCopy.resetAlert.actions[0]} onPress={closeOverlay} variant="text" />
          </>
        );
      case 'data-reset-done':
        return <ResultContent body="Guided showcase history, conditions, and settings are restored locally." onDone={closeOverlay} title="Demo data reset" />;
      case 'data-delete':
        return (
          <>
            <ModalHeader body={manageDataCopy.deleteAlert.body} eyebrow="DESTRUCTIVE LOCAL CONFIRMATION" title={manageDataCopy.deleteAlert.title} />
            <PillButton
              fullWidth
              label={manageDataCopy.deleteAlert.actions[1]}
              onPress={() => {
                dispatch({ type: 'debug/reset' });
                closeOverlay();
                router.replace('/onboarding/value');
              }}
              variant="destructive"
            />
            <PillButton fullWidth label={manageDataCopy.deleteAlert.actions[0]} onPress={closeOverlay} variant="text" />
          </>
        );
      case 'day-boundary':
        return (
          <>
            <ModalHeader body={generalSettingsOptions.dayBoundary.consequence.replace('4:00 AM', boundaryDraft)} eyebrow="TRANSACTIONAL LOCAL EDIT" title="Choose a custom day boundary" />
            <View style={styles.optionGrid}>
              {customBoundaryValues.map((value) => (
                <PillButton key={value} label={value} onPress={() => setBoundaryDraft(value)} variant={boundaryDraft === value ? 'dark' : 'secondary'} />
              ))}
            </View>
            <PillButton
              fullWidth
              label={generalSettingsOptions.dayBoundary.primary}
              onPress={() => {
                dispatch({ type: 'settings/set-day-boundary', value: boundaryDraft });
                setNotice(`Custom day boundary saved at ${boundaryDraft}.`);
                closeOverlay();
              }}
              variant="dark"
            />
            <PillButton fullWidth label="Cancel" onPress={closeOverlay} variant="text" />
          </>
        );
      case 'health-disconnect':
        return (
          <>
            <ModalHeader body={appleHealthCopy.disconnectAlert.body} eyebrow="LOCAL CONNECTION CONFIRMATION" title={appleHealthCopy.disconnectAlert.title} />
            <PillButton
              fullWidth
              label={appleHealthCopy.disconnectAlert.actions[1]}
              onPress={() => {
                dispatch({ type: 'settings/set-health-connected', value: false });
                setNotice('Apple Health demo disconnected. Conditions now show Needs attention.');
                closeOverlay();
              }}
              variant="destructive"
            />
            <PillButton fullWidth label={appleHealthCopy.disconnectAlert.actions[0]} onPress={closeOverlay} variant="text" />
          </>
        );
      case 'health-reconnect':
        return (
          <>
            <ModalHeader body="Reconnect changes only the local connection status. No Health authorization is requested." eyebrow="SIMULATED HEALTH PERMISSION SHEET" title="Reconnect Apple Health?" />
            <PillButton
              fullWidth
              label="Reconnect in demo"
              onPress={() => {
                dispatch({ type: 'settings/set-health-connected', value: true });
                setNotice('Apple Health demo reconnected. Sample signals are available again.');
                closeOverlay();
              }}
              variant="dark"
            />
            <PillButton fullWidth label="Not now" onPress={closeOverlay} variant="text" />
          </>
        );
      case 'language-settings':
        return (
          <>
            <ModalHeader
              body="This simulates the iOS per-app language handoff. No Settings page opens and the device language is unchanged."
              eyebrow="SIMULATED IOS SETTINGS"
              title="Preferred Language"
            />
            <PillowCard padding="none" variant="strong">
              <SettingsRow showChevron={false} title="System Default" value="English (US) · ✓" />
              <View style={styles.modalDivider} />
              <SettingsRow showChevron={false} title="English (US)" />
              <View style={styles.modalDivider} />
              <SettingsRow showChevron={false} title="Spanish" value="Preview only" />
            </PillowCard>
            <PillButton fullWidth label="Done" onPress={closeOverlay} variant="dark" />
          </>
        );
      case 'health-diagnostics':
        return <ResultContent body={state.settings.healthConnected ? 'Seven sample signal checks passed. No Health data was read.' : 'Connection needs attention. Reconnect the local fixture to restore sample signals.'} onDone={closeOverlay} title={state.settings.healthConnected ? 'Diagnostics complete' : 'Diagnostics found one issue'} />;
      default:
        return null;
    }
  };

  return (
    <>
      <SettingsDetailScreen
        body={detail.body}
        footer={section === 'about' ? (
          <PressableScale
            accessibilityLabel="About version. Tap seven times for local debug entry"
            accessibilityRole="button"
            onPress={() => {
              aboutFooterTaps.current += 1;
              if (aboutFooterTaps.current < settingsRootCopy.debugTapCount) return;
              aboutFooterTaps.current = 0;
              router.push('/debug');
            }}
          >
            <View style={styles.aboutFooter}>
              <Text style={styles.aboutFooterText}>{settingsRootCopy.footer}</Text>
            </View>
          </PressableScale>
        ) : undefined}
        lightMode={section === 'appearance' && state.settings.appearance === 'light'}
        onBack={() => router.back()}
        onRowPress={handleRow}
        onToggle={(rowId, value) => {
          if (rowId === 'haptics') dispatch({ type: 'settings/toggle', key: 'haptics', value });
          if (rowId === 'sounds') dispatch({ type: 'settings/set-sounds', value });
        }}
        preview={section === 'appearance' ? <AppearancePreview appearance={state.settings.appearance} /> : undefined}
        prototypeDisclosure={notice}
        sections={detail.sections}
        title={detail.title}
      />
      <AccessibleModal
        accessibilityTitle={overlayTitle(overlay)}
        animationType="slide"
        onRequestClose={closeOverlay}
        style={styles.backdrop}
        visible={overlay !== null}
      >
        <PillowCard style={styles.modalCard} variant="light">
          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {modalContent()}
          </ScrollView>
        </PillowCard>
      </AccessibleModal>
      <SimulatedShareSheet
        disclosure={aboutDetailCopy.share.disclosure}
        onDone={() => {
          setAboutShareVisible(false);
          setAboutShareDestination(null);
        }}
        onRequestClose={() => {
          setAboutShareVisible(false);
          setAboutShareDestination(null);
        }}
        onSelectDestination={setAboutShareDestination}
        previewSubtitle={aboutDetailCopy.share.text}
        previewTitle="ExcerLock — Workout to Unlock"
        selectedDestination={aboutShareDestination}
        visible={aboutShareVisible}
      />
    </>
  );
}

function makeDetail(
  section: string,
  settings: DemoState['settings'],
  selectedPlan: DemoState['selectedPlan'],
): { body?: string; sections: SettingsDetailSection[]; title: string } {
  switch (section) {
    case 'subscription': {
      const subscription = getSubscriptionPresentation(
        settings.subscriptionStatus,
        selectedPlan,
        settings.subscriptionOffer,
      );
      return {
        title: 'Manage Subscription',
        body: `${subscription.status} · ${subscription.plan}\n${subscription.accessThrough} · ${subscription.renewal}`,
        sections: [{ id: 'subscription', rows: subscriptionRows.map((row) => ({ id: row.label.toLowerCase().replaceAll(' ', '-'), title: row.label, subtitle: row.subtitle })) }],
      };
    }
    case 'general':
      return {
        title: 'General',
        sections: [{ id: 'general', rows: generalSettingsRows.map((row) => ({
          id: row.id,
          kind: 'toggle' in row && row.toggle ? 'toggle' : 'navigation',
          title: row.label,
          value: row.id === 'appearance'
            ? appearanceLabels[settings.appearance]
            : row.id === 'dayBoundary'
              ? settings.dayBoundary === 'midnight' ? 'Midnight' : settings.dayBoundary
              : row.id === 'startWeek'
                ? startWeekLabels[settings.startWeek]
                : row.id === 'units'
                  ? unitLabels[settings.units]
                  : row.id === 'shortcuts'
                    ? `${Object.values(settings.shortcuts).filter(Boolean).length} added`
                    : row.id === 'haptics'
                      ? settings.haptics
                    : row.id === 'sounds'
                        ? settings.sounds
                        : row.value,
        })) }],
      };
    case 'appearance':
      return choiceDetail('Appearance', generalSettingsOptions.appearance.helper, generalSettingsOptions.appearance.options, appearanceLabels[settings.appearance]);
    case 'language':
      return { title: generalSettingsOptions.language.title, body: generalSettingsOptions.language.body, sections: [{ id: 'language', rows: [{ id: 'open-settings-preview', title: generalSettingsOptions.language.primary, subtitle: generalSettingsOptions.language.disclosure }] }] };
    case 'day-boundary':
      return {
        ...choiceDetail(generalSettingsOptions.dayBoundary.title, generalSettingsOptions.dayBoundary.body, generalSettingsOptions.dayBoundary.options, settings.dayBoundary === 'midnight' ? 'Off · Midnight' : 'Custom'),
        sections: [
          { id: 'current', rows: [{ id: 'current-boundary', kind: 'action', title: 'Current reset time', value: settings.dayBoundary === 'midnight' ? 'Midnight' : settings.dayBoundary }] },
          ...choiceDetail('', '', generalSettingsOptions.dayBoundary.options, settings.dayBoundary === 'midnight' ? 'Off · Midnight' : 'Custom').sections,
        ],
      };
    case 'start-week':
      return choiceDetail('Start week on', 'This changes only the sample Analysis column order.', generalSettingsOptions.startWeek.options, startWeekLabels[settings.startWeek]);
    case 'units':
      return choiceDetail('Units', generalSettingsOptions.units.helper, generalSettingsOptions.units.options, unitLabels[settings.units]);
    case 'nudge-time':
      return choiceDetail('Afternoon nudge time', 'Prototype time selection. Nothing is scheduled.', ['2:00 PM', '3:00 PM', '4:00 PM'], settings.nudgeTime);
    case 'connections':
      return {
        title: connectionsCopy.title,
        body: connectionsCopy.body,
        sections: [{ id: 'connections', rows: [
          { id: 'apple-health', title: 'Apple Health', value: settings.healthConnected ? 'Demo status · Connected' : 'Needs attention · Disconnected' },
          { id: 'shortcuts', title: 'Siri & Shortcuts', value: `${Object.values(settings.shortcuts).filter(Boolean).length} demo shortcut${Object.values(settings.shortcuts).filter(Boolean).length === 1 ? '' : 's'} added` },
        ] }],
      };
    case 'apple-health':
      return {
        title: appleHealthCopy.title,
        body: appleHealthCopy.body,
        sections: [
          { id: 'manual-entry', rows: [{ id: 'manual-entry-rule', kind: 'action', title: 'Manual-entry rule', subtitle: appleHealthCopy.manualEntryNote }] },
          { id: 'status', rows: [{ id: 'health-status', kind: 'action', title: 'Connection status', value: settings.healthConnected ? 'Connected in demo' : 'Needs attention' }] },
          { id: 'signals', title: 'SAMPLE SIGNALS', rows: appleHealthCopy.signals.map((signal) => ({ id: signal.signal.toLowerCase().replaceAll(' ', '-'), title: signal.signal, value: settings.healthConnected ? signal.status : 'Needs attention' })) },
          { id: 'actions', rows: [
            { id: 'diagnostics', title: appleHealthCopy.diagnosticsAction },
            { id: 'permission-health', title: 'Permission health' },
            { destructive: settings.healthConnected, id: 'health-connection', title: settings.healthConnected ? 'Disconnect Apple Health demo' : 'Reconnect Apple Health demo' },
          ] },
        ],
      };
    case 'shortcuts':
      return { title: 'Siri & Shortcuts', body: shortcutsDisclosure, sections: [{ id: 'shortcuts', rows: shortcutFixtures.map((shortcut) => ({ id: shortcut.id, title: shortcut.title, subtitle: shortcut.phrase, value: settings.shortcuts[shortcut.id] ? 'Added' : 'Add' })) }] };
    case 'data':
      return { title: manageDataCopy.title, body: manageDataCopy.body, sections: [{ id: 'data', rows: manageDataCopy.rows.map((row) => ({ id: row.id, destructive: row.id === 'delete', title: row.label, subtitle: row.subtitle })) }] };
    case 'about':
      return { title: aboutCopy.title, sections: [{ id: 'about', rows: aboutCopy.rows.map((row) => ({ id: row.id, title: row.label, subtitle: row.subtitle })) }] };
    case 'whats-new':
      return { title: whatsNewCopy.title, body: `${whatsNewCopy.release} · ${whatsNewCopy.date}`, sections: [{ id: 'release', rows: whatsNewCopy.cards.map((card) => ({ id: card.title.toLowerCase().replaceAll(' ', '-'), title: card.title, subtitle: card.body })) }] };
    case 'follow':
      return { title: aboutDetailCopy.follow.title, body: aboutDetailCopy.follow.body, sections: [{ id: 'follow', rows: aboutDetailCopy.follow.rows.map((row) => ({ id: row.label.toLowerCase(), title: row.label, subtitle: row.subtitle })) }] };
    case 'credits':
      return { title: aboutDetailCopy.credits.title, body: aboutDetailCopy.credits.body, sections: [{ id: 'credits', rows: [{ id: 'foundry', title: 'Visual provenance', subtitle: 'Recorded in local FOUNDRY manifests' }, { id: 'pillow', title: 'Pillow references', subtitle: 'Interaction and hierarchy study' }] }] };
    default:
      return { title: section.replaceAll('-', ' ').replace(/\b\w/g, (character) => character.toUpperCase()), body: 'This local detail keeps every action inside the prototype.', sections: [{ id: 'preview', rows: [{ id: 'preview-action', title: 'Open prototype preview', subtitle: 'No external app or service opens.' }] }] };
  }
}

function choiceDetail(title: string, body: string, options: readonly string[], selected: string) {
  return {
    title,
    body,
    sections: [{ id: 'choices', rows: options.map((option) => ({ id: option, kind: 'choice' as const, selected: option === selected, title: option })) }],
  };
}

function routeForRow(section: string, rowId: string): string | null {
  if (section === 'general') {
    const row = generalSettingsRows.find((candidate) => candidate.id === rowId);
    return row && 'route' in row ? row.route : null;
  }
  if (section === 'connections') return rowId === 'apple-health' ? '/settings/apple-health' : '/settings/shortcuts';
  if (section === 'apple-health') return rowId === 'permission-health' ? '/settings/permissions' : null;
  if (section === 'about') {
    const row = aboutCopy.rows.find((candidate) => candidate.id === rowId);
    return row && 'route' in row ? row.route : rowId === 'share' ? '/settings/share' : null;
  }
  if (section === 'subscription' && rowId.includes('help')) return '/support/help';
  return null;
}

function ModalHeader({ body, eyebrow, title }: { body: string; eyebrow: string; title: string }) {
  return (
    <>
      <Text style={styles.modalEyebrow}>{eyebrow}</Text>
      <AccessibleModalTitle style={styles.modalTitle}>{title}</AccessibleModalTitle>
      <Text style={styles.modalBody}>{body}</Text>
    </>
  );
}

function ResultContent({ body, onDone, title }: { body: string; onDone: () => void; title: string }) {
  return (
    <>
      <ModalHeader body={body} eyebrow="LOCAL PREVIEW RESULT" title={title} />
      <PillButton fullWidth label="Done" onPress={onDone} variant="dark" />
    </>
  );
}

function AppearancePreview({ appearance }: { appearance: DemoState['settings']['appearance'] }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const light = appearance === 'light';

  useEffect(() => {
    opacity.setValue(0);
    Animated.timing(opacity, {
      duration: motion.duration.standard,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [appearance, opacity]);

  return (
    <Animated.View
      accessibilityLabel={`${appearanceLabels[appearance]} appearance preview`}
      style={[
        styles.appearancePreview,
        { backgroundColor: light ? colors.canvas.ivory : colors.canvas.night, opacity },
      ]}
    >
      <Text style={[styles.appearancePreviewEyebrow, light && styles.appearancePreviewInk]}>
        LOCAL TOKEN CROSSFADE
      </Text>
      <Text style={[styles.appearancePreviewTitle, light && styles.appearancePreviewInk]}>
        {appearanceLabels[appearance]} surface
      </Text>
      <View style={styles.appearanceAccent} />
    </Animated.View>
  );
}

function overlayTitle(overlay: SettingsOverlay) {
  if (!overlay) return 'Settings preview';
  return overlay.replaceAll('-', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

const styles = StyleSheet.create({
  aboutFooter: { alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  aboutFooterText: { ...type.caption, color: colors.text.tertiary },
  appearanceAccent: { backgroundColor: colors.brand.signatureOrange, borderRadius: radius.pill, height: 8, width: 80 },
  appearancePreview: { borderRadius: radius.cardLarge, gap: space[2], minHeight: 132, padding: space[5] },
  appearancePreviewEyebrow: { ...type.micro, color: colors.text.secondary },
  appearancePreviewInk: { color: colors.text.ink },
  appearancePreviewTitle: { ...type.sectionTitle, color: colors.text.primary },
  backdrop: { backgroundColor: colors.surface.scrim, flex: 1, justifyContent: 'flex-end', padding: space[3] },
  darkTitle: { ...type.cardTitle, color: colors.text.primary },
  jsonPreview: { backgroundColor: colors.surface.cardStrong, borderRadius: radius.actionRow, padding: space[4] },
  jsonText: { ...type.caption, color: colors.text.primary },
  modalBody: { ...type.body, color: colors.text.ink, opacity: 0.72 },
  modalCard: { gap: space[3], maxHeight: '92%', padding: space[5] },
  modalDivider: { backgroundColor: colors.surface.divider, height: StyleSheet.hairlineWidth },
  modalEyebrow: { ...type.micro, color: colors.brand.burnt },
  modalNote: { ...type.caption, color: colors.text.ink, opacity: 0.62 },
  modalScroll: { gap: space[3] },
  modalTitle: { ...type.screenTitle, color: colors.text.ink },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  optionList: { gap: space[2] },
});
