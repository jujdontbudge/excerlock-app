import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  Easing,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useReducedMotion } from 'react-native-reanimated';

import { AccessibleModal, BrandedSlider, FullScreenModalPage, HeaderBackButton, HeroLock, PressableScale, SelectableBubble, VectorIcon, colors, layout, motion, radius, space, type } from '@/design-system';
import {
  onboardingPermissionRepair,
  onboardingScreens,
  privacyDetail,
  sampleAppGroups,
} from '@/content/onboarding';
import { assetRegistry } from '@/content';
import type {
  OnboardingPermissionKey,
  OnboardingStep,
  PermissionOutcome,
} from '@/presentation';
import { FeatureScaffold, OptionRow, PrototypeNotice, ScreenAction } from '@/features/shared';

const routeForStep = (step: OnboardingStep) => `/onboarding/${step}`;
const onboardingFlowScreens = onboardingScreens.filter((item) => item.route.startsWith('/onboarding/'));

const heroes: Partial<Record<OnboardingStep, ImageSourcePropType>> = {
  'screen-time': assetRegistry.heroes['permission-screen-time'],
  motion: assetRegistry.heroes['permission-health-motion'],
  health: assetRegistry.heroes['permission-health-motion'],
  location: assetRegistry.heroes['permission-location'],
  allowance: assetRegistry.heroes['allowance-clock'],
  done: assetRegistry.heroes['paywall-hero'],
};

export type OnboardingScreenProps = {
  allowanceMinutes: number | 'unlimited' | null;
  canContinue: boolean;
  onBack?: () => void;
  onCommitApps: (appIds: string[]) => void;
  onContinue: () => void;
  onJumpStep?: (step: OnboardingStep) => void;
  onSetAllowance: (minutes: number | 'unlimited') => void;
  onSetPermission: (permission: OnboardingPermissionKey, value: PermissionOutcome) => void;
  onSetPhoneUse: (hours: number) => void;
  permissionOutcomes: Record<OnboardingPermissionKey, PermissionOutcome>;
  phoneUseHours: number | null;
  selectedApps: string[];
  step: OnboardingStep;
};

export function OnboardingScreen({
  allowanceMinutes,
  canContinue,
  onBack,
  onCommitApps,
  onContinue,
  onJumpStep,
  onSetAllowance,
  onSetPermission,
  onSetPhoneUse,
  permissionOutcomes,
  phoneUseHours,
  selectedApps,
  step,
}: OnboardingScreenProps) {
  const [overlay, setOverlay] = useState<'permission' | 'privacy' | null>(null);
  const [appSearch, setAppSearch] = useState('');
  const [appCategory, setAppCategory] = useState('all');
  const [stagedApps, setStagedApps] = useState(() => [...selectedApps]);
  const initialSelectedApps = useRef([...selectedApps]);
  const previousStep = useRef(step);
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentOffset = useRef(new Animated.Value(14)).current;
  const reduceMotion = useReducedMotion();
  const screen = onboardingScreens.find((item) => item.route === routeForStep(step));

  useEffect(() => {
    if (step === 'apps' && previousStep.current !== 'apps') {
      initialSelectedApps.current = [...selectedApps];
      setStagedApps([...selectedApps]);
    }
    previousStep.current = step;
  }, [selectedApps, step]);

  useEffect(() => {
    contentOpacity.stopAnimation();
    contentOffset.stopAnimation();

    if (reduceMotion) {
      contentOpacity.setValue(1);
      contentOffset.setValue(0);
      return undefined;
    }

    contentOpacity.setValue(0);
    contentOffset.setValue(14);
    const animation = Animated.parallel([
      Animated.timing(contentOpacity, {
        duration: motion.duration.standard,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(contentOffset, {
        duration: motion.duration.standard,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        toValue: 0,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [contentOffset, contentOpacity, reduceMotion, step]);

  if (!screen) return null;

  const hero = heroes[step];
  const flowIndex = onboardingFlowScreens.indexOf(screen);
  const progressStep = Math.max(1, flowIndex + 1);
  const choiceFocused = step === 'confession' || step === 'apps' || step === 'allowance' || step === 'review';
  const annualDays = phoneUseHours === null ? null : Math.round((phoneUseHours * 365) / 24);
  const displayTitle = step === 'mirror' && annualDays !== null
    ? `That’s about ${annualDays} days a year.`
    : screen.title;
  const displayBody = step === 'mirror' && annualDays !== null
    ? `No guilt. That’s roughly ${phoneUseHours! * 365} hours — just a little time worth taking back.`
    : 'body' in screen ? screen.body : undefined;
  const permissionStep: OnboardingPermissionKey | null =
    step === 'screen-time'
      ? 'screenTime'
      : step === 'motion' || step === 'health' || step === 'location'
        ? step
        : null;
  const permissionLabel: Record<OnboardingPermissionKey, string> = {
    screenTime: 'Screen Time',
    motion: 'Motion & Fitness',
    health: 'Apple Health',
    location: 'Location',
  };
  const permissionValue = (outcome: PermissionOutcome) =>
    outcome === 'allowed' ? 'Allowed in demo' : outcome === 'denied' ? 'Not now' : 'Not asked';
  const reviewRows = [
    { label: 'Locked apps', target: 'apps' as const, value: `${selectedApps.length} selected` },
    {
      label: 'Daily allowance',
      target: 'allowance' as const,
      value: allowanceMinutes === 'unlimited' ? 'Unlimited' : allowanceMinutes === 0 ? 'Full Lock' : allowanceMinutes === null ? 'Not chosen' : `${allowanceMinutes} min`,
    },
    { label: 'Screen Time', target: 'screen-time' as const, value: permissionValue(permissionOutcomes.screenTime) },
    { label: 'Motion & Fitness', target: 'motion' as const, value: permissionValue(permissionOutcomes.motion) },
    { label: 'Apple Health', target: 'health' as const, value: permissionValue(permissionOutcomes.health) },
    { label: 'Location', target: 'location' as const, value: permissionValue(permissionOutcomes.location) },
  ];
  const shouldSimulatePermission =
    'simulatedNativeId' in screen && screen.simulatedNativeId && step !== 'apps';
  const primary = () => {
    if (shouldSimulatePermission) {
      setOverlay('permission');
    }
    else if (step === 'apps') {
      onCommitApps([...stagedApps]);
      onContinue();
    }
    else onContinue();
  };
  const secondaryLabel =
    step === 'apps' ? 'Cancel' : step === 'motion' ? 'Not now' : step === 'health' || step === 'location' ? 'Skip' : null;
  const canSubmit = step === 'apps' ? stagedApps.length > 0 : canContinue;
  const appSelectionChanged = [...initialSelectedApps.current].sort().join('|') !== [...stagedApps].sort().join('|');
  const discardAppsAndGoBack = () => {
    setStagedApps([...initialSelectedApps.current]);
    onBack?.();
  };
  const secondary = () => {
    if (step === 'apps') {
      requestBack();
      return;
    }
    if (permissionStep) onSetPermission(permissionStep, 'denied');
    onContinue();
  };
  const requestBack = () => {
    if (step !== 'apps' || !appSelectionChanged) {
      onBack?.();
      return;
    }
    Alert.alert(
      'Keep these app choices?',
      'Your sample selection changed on this screen.',
      [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard and go back', style: 'destructive', onPress: discardAppsAndGoBack },
      ],
    );
  };
  const visibleGroups = sampleAppGroups
    .filter((group) => appCategory === 'all' || group.id === appCategory)
    .map((group) => ({
      ...group,
      options: group.options.filter((app) => `${app.label} ${app.subtitle ?? ''}`.toLowerCase().includes(appSearch.trim().toLowerCase())),
    }))
    .filter((group) => group.options.length > 0);

  return (
    <>
      <StatusBar style="light" />
      <FeatureScaffold
        accessibilityLabel={screen.title}
        floatingFooter
        footer={
          <View style={styles.footerActions}>
            <ScreenAction
              disabled={!canSubmit}
              label={screen.primary?.label ?? 'Continue'}
              onPress={primary}
              tone="dark"
              variant="screen"
            />
            {secondaryLabel ? (
              <ScreenAction label={secondaryLabel} onPress={secondary} tone="dark" variant="text" />
            ) : null}
          </View>
        }
        scroll={step === 'apps'}
        tone="dark"
      >
        <OnboardingHeader
          currentStep={progressStep}
          onBack={step === 'value' ? undefined : requestBack}
          totalSteps={onboardingFlowScreens.length}
        />

        <Animated.View
          style={[
            styles.main,
            styles.mainTopAligned,
            { opacity: contentOpacity, transform: [{ translateY: contentOffset }] },
          ]}
          testID="onboarding-main"
        >
          <Text style={styles.title}>{displayTitle}</Text>
          {displayBody ? <Text style={styles.body}>{displayBody}</Text> : null}

          {step === 'value' || step === 'privacy' ? (
            <HeroLock
              accessibilityLabel={step === 'privacy' ? 'Your activity stays private' : 'Friendly ExcerLock padlock'}
              size={190}
              state={step === 'privacy' ? 'unlocked' : 'locked'}
              style={styles.heroLock}
            />
          ) : hero && !choiceFocused ? (
            <View style={[styles.hero, step === 'done' && styles.heroDone]}>
              <VectorIcon source={hero} style={styles.heroAsset} />
            </View>
          ) : null}

          {permissionStep && permissionStep !== 'screenTime' && permissionOutcomes[permissionStep] === 'denied' ? (
            <PrototypeNotice>{permissionLabel[permissionStep]} is off in this demo. You can still continue and revisit its repair preview in Settings.</PrototypeNotice>
          ) : null}

          {step === 'screen-time' && permissionOutcomes.screenTime === 'denied' ? (
            <View accessibilityLiveRegion="polite" style={styles.repairCard}>
              <Text style={styles.repairTitle}>{onboardingPermissionRepair.screenTime.title}</Text>
              <Text style={styles.repairBody}>{onboardingPermissionRepair.screenTime.body}</Text>
              <ScreenAction
                label={onboardingPermissionRepair.screenTime.action}
                onPress={() => {
                  setOverlay('permission');
                }}
                variant="secondary"
              />
            </View>
          ) : null}

          {step === 'confession' ? (
            <View style={styles.sliderBlock}>
              <BrandedSlider
                accessibilityLabel="Daily phone use, 1 through 12 or more hours"
                displayValue={`${phoneUseHours ?? 3}${phoneUseHours === 12 ? '+' : ''}h`}
                maximumLabel="12+h"
                maximumValue={12}
                minimumLabel="1h"
                minimumValue={1}
                onChange={onSetPhoneUse}
                step={1}
                testID="phone-use-slider"
                value={phoneUseHours ?? 3}
              />
            </View>
          ) : null}

          {step === 'apps' ? (
            <View style={styles.listBlock}>
              <Text style={styles.selectionCount}>{stagedApps.length} selected</Text>
              <TextInput
                accessibilityLabel="Search sample apps"
                onChangeText={setAppSearch}
                placeholder="Search sample apps"
                placeholderTextColor={colors.text.tertiary}
                style={styles.searchInput}
                value={appSearch}
              />
              <View accessibilityLabel="App categories" accessibilityRole="radiogroup" style={styles.categoryRow}>
                {[{ id: 'all', label: 'All' }, ...sampleAppGroups].map((group) => (
                  <SelectableBubble
                    accessibilityLabel={group.label}
                    compact
                    contentStyle={styles.categoryChoiceSurface}
                    key={group.id}
                    label={group.label}
                    onPress={() => setAppCategory(group.id)}
                    role="radio"
                    selected={appCategory === group.id}
                    style={styles.categoryChoice}
                  />
                ))}
              </View>
              {visibleGroups.map((group) => (
                <View key={group.id} style={styles.appGroup}>
                  <Text style={styles.groupLabel}>{group.label.toUpperCase()}</Text>
                  {group.options.map((app) => (
                    <OptionRow
                      key={app.id}
                      label={app.label}
                      onPress={() => setStagedApps((current) => current.includes(app.id)
                        ? current.filter((id) => id !== app.id)
                        : [...current, app.id])}
                      selected={stagedApps.includes(app.id)}
                      subtitle={app.subtitle}
                      tone="dark"
                    />
                  ))}
                </View>
              ))}
              {visibleGroups.length === 0 ? <Text style={styles.rangeHint}>No sample apps match.</Text> : null}
            </View>
          ) : null}

          {step === 'allowance' ? (
            <View style={styles.sliderBlock}>
              <BrandedSlider
                accessibilityLabel="Daily free allowance, zero through four hours in five minute steps"
                displayValue={allowanceMinutes === 'unlimited'
                  ? 'Unlimited'
                  : `${typeof allowanceMinutes === 'number' ? allowanceMinutes : 45} min`}
                maximumLabel="4h"
                maximumValue={240}
                minimumLabel="Full Lock"
                minimumValue={0}
                onChange={onSetAllowance}
                step={5}
                testID="allowance-slider"
                value={typeof allowanceMinutes === 'number' ? allowanceMinutes : 45}
              />
              <SelectableBubble
                accessibilityLabel="Unlimited"
                fullWidth
                label="Unlimited"
                onPress={() => onSetAllowance('unlimited')}
                role="radio"
                selected={allowanceMinutes === 'unlimited'}
              />
            </View>
          ) : null}

          {step === 'review' ? (
            <View style={styles.listBlock}>
              {reviewRows.map((row) => (
                <OptionRow
                  key={row.label}
                  label={row.label}
                  onPress={() => onJumpStep?.(row.target)}
                  trailing={row.value}
                />
              ))}
            </View>
          ) : null}

          {step === 'privacy' ? (
            <ScreenAction label="Learn more" onPress={() => setOverlay('privacy')} variant="text" />
          ) : null}

          {step === 'done' ? <Text style={styles.doneNote}>A calm plan. Your choices. No real device changes.</Text> : null}
        </Animated.View>
      </FeatureScaffold>

      <AccessibleModal
        accessibilityTitle={overlay === 'privacy' ? privacyDetail.title : `Allow “ExcerLock” to preview ${screen.title.toLowerCase()}`}
        contentContainerStyle={styles.modalPage}
        onRequestClose={() => setOverlay(null)}
        scrollEnabled={false}
        style={styles.modalBackdrop}
        visible={overlay !== null}
      >
          <View accessibilityViewIsModal style={[styles.modalCard, styles.modalCardFull]}>
            <FullScreenModalPage
              body={overlay === 'privacy' ? undefined : 'No permission is requested and no device data is read. This choice changes only the local demo label.'}
              footer={(
                <>
              {overlay === 'permission' ? (
                <ScreenAction
                  label="Not now"
                  onPress={() => {
                    setOverlay(null);
                    if (permissionStep) onSetPermission(permissionStep, 'denied');
                    if (step !== 'screen-time') onContinue();
                  }}
                  variant="text"
                />
              ) : null}
              <ScreenAction
                label={overlay === 'privacy' ? 'Done' : 'Allowed in demo'}
                onPress={() => {
                  setOverlay(null);
                  if (overlay === 'permission') {
                    if (permissionStep) onSetPermission(permissionStep, 'allowed');
                    onContinue();
                  }
                }}
                variant="screen"
              />
                </>
              )}
            >
              {overlay === 'privacy' ? (
                <View style={styles.modalParagraphs}>
                  {privacyDetail.paragraphs.map((paragraph) => (
                    <Text key={paragraph} style={styles.modalBody}>{paragraph}</Text>
                  ))}
                </View>
              ) : null}
            </FullScreenModalPage>
          </View>
      </AccessibleModal>
    </>
  );
}

function OnboardingHeader({
  currentStep,
  onBack,
  totalSteps,
}: {
  currentStep: number;
  onBack?: () => void;
  totalSteps: number;
}) {
  return (
    <View style={styles.header} testID="onboarding-top-row">
      {onBack ? <HeaderBackButton onPress={onBack} /> : <View style={styles.backButton} />}
      <View
        accessible
        accessibilityLabel={`Onboarding step ${currentStep} of ${totalSteps}`}
        accessibilityRole="progressbar"
        accessibilityValue={{ max: totalSteps, min: 1, now: currentStep }}
        style={styles.progressTrack}
        testID="onboarding-progress"
      >
        <View
          style={[
            styles.progressFill,
            { width: `${Math.max(6, (currentStep / totalSteps) * 100)}%` },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: { alignItems: 'flex-start', height: 44, justifyContent: 'center', width: 44 },
  body: { ...type.body, color: colors.text.secondary, textAlign: 'left' },
  appGroup: { gap: space[2] },
  categoryChip: { backgroundColor: colors.surface.cardElevated, borderRadius: radius.pill, paddingHorizontal: space[3], paddingVertical: space[2] },
  categoryChipLight: { backgroundColor: colors.surface.ivoryBlur },
  categoryChipSelected: { backgroundColor: colors.surface.light },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  categoryChoice: { flexBasis: '48%', flexGrow: 1 },
  categoryChoiceSurface: { width: '100%' },
  categoryText: { ...type.caption, color: colors.text.primary },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], justifyContent: 'center' },
  choiceChip: {
    alignItems: 'center',
    backgroundColor: colors.surface.cardElevated,
    borderRadius: radius.control,
    justifyContent: 'center',
    minHeight: layout.controlHeightCompact,
    minWidth: 72,
    paddingHorizontal: space[4],
  },
  choiceChipSelected: { backgroundColor: colors.surface.light },
  choiceChipText: { ...type.label, color: colors.text.primary },
  choiceChipTextSelected: { color: colors.text.onLight },
  consequence: { ...type.caption, color: colors.text.secondary, textAlign: 'center' },
  doneNote: { ...type.caption, color: colors.text.secondary, marginTop: space[3], textAlign: 'center' },
  eyebrow: { ...type.micro, color: colors.brand.signatureAmber, textAlign: 'center', textTransform: 'uppercase' },
  eyebrowLight: { color: colors.brand.burnt },
  footerActions: { gap: space[1] },
  hero: { alignSelf: 'center', height: 168, marginTop: space[6], width: 190 },
  heroAsset: { height: '100%', width: '100%' },
  heroDone: { height: 196, width: 220 },
  heroLock: { marginTop: space[6] },
  heroValue: { ...type.heroMd, color: colors.text.primary, textAlign: 'center' },
  header: { alignItems: 'center', flexDirection: 'row', gap: space[3] },
  inkSecondary: { color: colors.text.ink },
  inkText: { color: colors.text.ink },
  groupLabel: { ...type.micro, color: colors.text.secondary, marginTop: space[2] },
  listBlock: { gap: space[2], marginTop: space[4] },
  main: { flex: 1, gap: space[3], justifyContent: 'center', paddingBottom: space[8], paddingTop: space[6] },
  mainTopAligned: { justifyContent: 'flex-start', paddingTop: space[6] },
  modalActions: { gap: space[2], marginTop: space[3] },
  modalBackdrop: { flex: 1 },
  modalBody: { ...type.body, color: colors.text.ink },
  modalCard: { gap: space[3], maxWidth: 390, padding: space[5], width: '100%' },
  modalCardFull: { flex: 1, paddingBottom: 0, paddingTop: 0 },
  modalPage: { flex: 1 },
  modalParagraphs: { gap: space[3] },
  modalEyebrow: { ...type.micro, color: colors.text.primary, textTransform: 'uppercase' },
  modalTitle: { ...type.sheetTitle, color: colors.text.ink },
  progressFill: { backgroundColor: colors.surface.light, borderRadius: radius.pill, height: 4 },
  progressFillLight: { backgroundColor: colors.brand.primary },
  progressTrack: { backgroundColor: colors.surface.trackDark, borderRadius: radius.pill, flex: 1, height: 7, overflow: 'hidden' },
  progressTrackLight: { backgroundColor: colors.asset.clayShade },
  repairBody: { ...type.caption, color: colors.text.secondary },
  repairCard: { backgroundColor: colors.surface.cardElevated, borderRadius: radius.card, gap: space[2], padding: space[4] },
  repairTitle: { ...type.cardTitle, color: colors.text.primary },
  rangeHint: { ...type.caption, color: colors.text.tertiary, textAlign: 'center' },
  searchInput: { ...type.body, backgroundColor: colors.surface.field, borderRadius: radius.control, color: colors.text.primary, minHeight: layout.controlHeight, paddingHorizontal: space[4] },
  searchInputLight: { backgroundColor: colors.surface.bubble, color: colors.text.primary },
  selectionCount: { ...type.label, color: colors.text.secondary, textAlign: 'right' },
  sliderBlock: { alignSelf: 'stretch', gap: space[5], marginTop: space[8], width: '100%' },
  stepper: { alignItems: 'center', flexDirection: 'row', gap: space[4], justifyContent: 'center' },
  stepperButton: { alignItems: 'center', backgroundColor: colors.surface.light, borderRadius: radius.pill, height: 48, justifyContent: 'center', width: 48 },
  stepperButtonText: { ...type.sectionTitle, color: colors.text.onLight },
  stepperValue: { ...type.sectionTitle, color: colors.text.primary, minWidth: 112, textAlign: 'center' },
  title: { ...type.screenLarge, color: colors.text.primary, textAlign: 'left' },
});
