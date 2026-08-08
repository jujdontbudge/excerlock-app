import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AccessibleModal, AccessibleModalTitle, HeroLock, PressableScale, colors, radius, space, type } from '@/design-system';
import {
  allowancePicker,
  onboardingPermissionRepair,
  onboardingScreens,
  privacyDetail,
  sampleAppGroups,
} from '@/content/onboarding';
import type {
  OnboardingPermissionKey,
  OnboardingStep,
  PermissionOutcome,
} from '@/presentation';
import { FeatureScaffold, OptionRow, PrototypeNotice, ScreenAction } from '@/features/shared';

const routeForStep = (step: OnboardingStep) => `/onboarding/${step}`;

const heroes: Partial<Record<OnboardingStep, ImageSourcePropType>> = {
  'screen-time': require('../../../assets/heroes/permission-screen-time.png'),
  motion: require('../../../assets/heroes/permission-health-motion.png'),
  health: require('../../../assets/heroes/permission-health-motion.png'),
  location: require('../../../assets/heroes/permission-location.png'),
  allowance: require('../../../assets/heroes/allowance-clock.png'),
  done: require('../../../assets/heroes/paywall-hero.png'),
};

function allowanceConsequence(value: number | 'unlimited' | null) {
  if (value === null) return 'Choose a sample allowance to preview when movement starts earning room.';
  if (value === 'unlimited') return 'Apps would stay available without a daily free-time limit in this demo.';
  if (value === 0) return 'Apps would lock immediately, then open again when you earn time.';
  if (value === 45) return allowancePicker.guidedConsequence;
  return `Apps would lock after ${value} minutes, then open again when you earn time.`;
}

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
  const screen = onboardingScreens.find((item) => item.route === routeForStep(step));

  useEffect(() => {
    if (step === 'apps' && previousStep.current !== 'apps') {
      initialSelectedApps.current = [...selectedApps];
      setStagedApps([...selectedApps]);
    }
    previousStep.current = step;
  }, [selectedApps, step]);

  if (!screen) return null;

  const hero = heroes[step];
  const annualDays = phoneUseHours === null ? null : Math.round((phoneUseHours * 365) / 24);
  const displayEyebrow = step === 'mirror' && phoneUseHours !== null
    ? `At ${phoneUseHours} ${phoneUseHours === 1 ? 'hour' : 'hours'} a day.`
    : 'eyebrow' in screen ? screen.eyebrow : undefined;
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
      <StatusBar style={step === 'apps' ? 'dark' : 'light'} />
      <FeatureScaffold
        accessibilityLabel={screen.title}
        footer={
          <View style={styles.footerActions}>
            <ScreenAction
              disabled={!canSubmit}
              label={screen.primary?.label ?? 'Continue'}
              onPress={primary}
              tone={step === 'apps' ? 'light' : 'dark'}
              variant={step === 'apps' ? 'dark' : 'screen'}
            />
            {secondaryLabel ? (
              <ScreenAction label={secondaryLabel} onPress={secondary} tone={step === 'apps' ? 'light' : 'dark'} variant="text" />
            ) : null}
          </View>
        }
        canvasVariant={step === 'apps' ? 'ivory' : undefined}
        onBack={step !== 'value' && step !== 'done' ? requestBack : undefined}
        tone={step === 'apps' ? 'light' : 'dark'}
      >
        <View style={[styles.progressTrack, step === 'apps' && styles.progressTrackLight]}>
          <View
            accessibilityLabel={`Onboarding step ${Math.max(1, onboardingScreens.indexOf(screen))} of 12`}
            accessibilityRole="progressbar"
            style={[
              styles.progressFill,
              step === 'apps' && styles.progressFillLight,
              { width: `${Math.max(7, (Math.max(1, onboardingScreens.indexOf(screen)) / 12) * 100)}%` },
            ]}
          />
        </View>

        <View style={styles.main}>
          {step === 'value' || step === 'privacy' ? (
            <HeroLock
              accessibilityLabel={step === 'privacy' ? 'Your activity stays private' : 'Friendly ExcerLock padlock'}
              size={190}
              state={step === 'privacy' ? 'unlocked' : 'locked'}
              style={styles.heroLock}
            />
          ) : hero ? (
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={hero}
              style={[styles.hero, step === 'done' && styles.heroDone]}
            />
          ) : null}
          {displayEyebrow ? <Text style={[styles.eyebrow, step === 'apps' && styles.eyebrowLight]}>{displayEyebrow}</Text> : null}
          <Text style={[styles.title, step === 'apps' && styles.inkText]}>{displayTitle}</Text>
          {displayBody ? <Text style={[styles.body, step === 'apps' && styles.inkSecondary]}>{displayBody}</Text> : null}
          {'operationalNote' in screen && screen.operationalNote ? (
            <PrototypeNotice>{screen.operationalNote}</PrototypeNotice>
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
            <View style={styles.choiceBlock}>
              <Text accessibilityLiveRegion="polite" style={styles.heroValue}>
                {phoneUseHours ? `${phoneUseHours} hours` : 'Choose'}
              </Text>
              <RangeStepper
                accessibilityLabel="Daily phone use, 1 through 12 or more hours"
                displayValue={phoneUseHours ? `${phoneUseHours}${phoneUseHours === 12 ? '+' : ''} h` : 'Not chosen'}
                max={12}
                min={1}
                onChange={onSetPhoneUse}
                step={1}
                value={phoneUseHours}
              />
              <Text style={styles.rangeHint}>1 hour · 12+ hours</Text>
            </View>
          ) : null}

          {step === 'apps' ? (
            <View style={styles.listBlock}>
              <PrototypeNotice tone="light">Sample apps only — installed apps are never inspected.</PrototypeNotice>
              <Text style={[styles.selectionCount, styles.inkSecondary]}>{stagedApps.length} selected</Text>
              <TextInput
                accessibilityLabel="Search sample apps"
                onChangeText={setAppSearch}
                placeholder="Search sample apps"
                placeholderTextColor={colors.text.ink}
                style={[styles.searchInput, styles.searchInputLight]}
                value={appSearch}
              />
              <View accessibilityLabel="App categories" accessibilityRole="radiogroup" style={styles.categoryRow}>
                {[{ id: 'all', label: 'All' }, ...sampleAppGroups].map((group) => (
                  <PressableScale
                    accessibilityLabel={group.label}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: appCategory === group.id }}
                    key={group.id}
                    onPress={() => setAppCategory(group.id)}
                  >
                    <View style={[styles.categoryChip, styles.categoryChipLight, appCategory === group.id && styles.categoryChipSelected]}>
                      <Text style={[styles.categoryText, styles.inkText, appCategory === group.id && styles.choiceChipTextSelected]}>{group.label}</Text>
                    </View>
                  </PressableScale>
                ))}
              </View>
              {visibleGroups.map((group) => (
                <View key={group.id} style={styles.appGroup}>
                  <Text style={[styles.groupLabel, styles.inkSecondary]}>{group.label.toUpperCase()}</Text>
                  {group.options.map((app) => (
                    <OptionRow
                      key={app.id}
                      label={app.label}
                      onPress={() => setStagedApps((current) => current.includes(app.id)
                        ? current.filter((id) => id !== app.id)
                        : [...current, app.id])}
                      selected={stagedApps.includes(app.id)}
                      subtitle={app.subtitle}
                      tone="light"
                    />
                  ))}
                </View>
              ))}
              {visibleGroups.length === 0 ? <Text style={[styles.rangeHint, styles.inkSecondary]}>No sample apps match.</Text> : null}
            </View>
          ) : null}

          {step === 'allowance' ? (
            <View style={styles.choiceBlock}>
              <Text accessibilityLiveRegion="polite" style={styles.heroValue}>
                {allowanceMinutes === null
                  ? 'Choose'
                  : allowanceMinutes === 'unlimited'
                    ? 'Unlimited'
                    : allowanceMinutes === 0
                      ? 'Full Lock'
                      : `${allowanceMinutes} min`}
              </Text>
              <RangeStepper
                accessibilityLabel="Daily free allowance, zero through four hours in five minute steps"
                displayValue={typeof allowanceMinutes === 'number' ? `${allowanceMinutes} min` : 'Not chosen'}
                max={240}
                min={0}
                onChange={onSetAllowance}
                step={5}
                value={typeof allowanceMinutes === 'number' ? allowanceMinutes : null}
              />
              <View style={styles.chipGrid}>
                <PressableScale
                  accessibilityLabel="Unlimited"
                  accessibilityRole="button"
                  accessibilityState={{ selected: allowanceMinutes === 'unlimited' }}
                  onPress={() => onSetAllowance('unlimited')}
                >
                  <View style={[styles.choiceChip, allowanceMinutes === 'unlimited' && styles.choiceChipSelected]}>
                    <Text style={[styles.choiceChipText, allowanceMinutes === 'unlimited' && styles.choiceChipTextSelected]}>
                      Unlimited
                    </Text>
                  </View>
                </PressableScale>
              </View>
              <Text style={styles.consequence}>
                {allowanceConsequence(allowanceMinutes)}
              </Text>
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
        </View>
      </FeatureScaffold>

      <AccessibleModal
        accessibilityTitle={overlay === 'privacy' ? privacyDetail.title : `Allow ExcerLock to preview ${screen.title.toLowerCase()}`}
        animationType="fade"
        onRequestClose={() => setOverlay(null)}
        style={styles.modalBackdrop}
        visible={overlay !== null}
      >
          <View accessibilityViewIsModal style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>Prototype preview</Text>
            <AccessibleModalTitle style={styles.modalTitle}>
              {overlay === 'privacy' ? privacyDetail.title : `Allow “ExcerLock” to preview ${screen.title.toLowerCase()}`}
            </AccessibleModalTitle>
            {overlay === 'privacy' ? privacyDetail.paragraphs.map((paragraph) => (
              <Text key={paragraph} style={styles.modalBody}>{paragraph}</Text>
            )) : (
              <Text style={styles.modalBody}>No permission is requested and no device data is read. This choice changes only the local demo label.</Text>
            )}
            <View style={styles.modalActions}>
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
                variant="dark"
              />
            </View>
          </View>
      </AccessibleModal>
    </>
  );
}

function RangeStepper({
  accessibilityLabel,
  displayValue,
  max,
  min,
  onChange,
  step,
  value,
}: {
  accessibilityLabel: string;
  displayValue: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number | null;
}) {
  const canDecrease = value !== null && value > min;
  const canIncrease = value === null || value < max;
  const update = (direction: -1 | 1) => {
    const next = value === null
      ? min
      : Math.min(max, Math.max(min, value + direction * step));
    onChange(next);
  };
  return (
    <View
      accessible
      accessibilityActions={[
        ...(canDecrease ? [{ label: 'Decrease', name: 'decrement' as const }] : []),
        ...(canIncrease ? [{ label: 'Increase', name: 'increment' as const }] : []),
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
      accessibilityValue={{ min, max, now: value ?? undefined, text: displayValue }}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'decrement' && canDecrease) update(-1);
        if (event.nativeEvent.actionName === 'increment' && canIncrease) update(1);
      }}
      style={styles.stepper}
    >
      <PressableScale accessibilityLabel="Decrease" accessibilityRole="button" disabled={!canDecrease} onPress={() => update(-1)}>
        <View style={styles.stepperButton}><Text style={styles.stepperButtonText}>−</Text></View>
      </PressableScale>
      <Text accessibilityLiveRegion="polite" style={styles.stepperValue}>{displayValue}</Text>
      <PressableScale accessibilityLabel="Increase" accessibilityRole="button" disabled={!canIncrease} onPress={() => update(1)}>
        <View style={styles.stepperButton}><Text style={styles.stepperButtonText}>+</Text></View>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { ...type.body, color: colors.text.secondary, textAlign: 'center' },
  appGroup: { gap: space[2] },
  categoryChip: { backgroundColor: colors.surface.cardElevated, borderRadius: radius.pill, paddingHorizontal: space[3], paddingVertical: space[2] },
  categoryChipLight: { backgroundColor: colors.surface.ivoryBlur },
  categoryChipSelected: { backgroundColor: colors.surface.light },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  categoryText: { ...type.caption, color: colors.text.primary },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], justifyContent: 'center' },
  choiceBlock: { gap: space[4], marginTop: space[3] },
  choiceChip: {
    alignItems: 'center',
    backgroundColor: colors.surface.cardElevated,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 72,
    paddingHorizontal: space[4],
  },
  choiceChipSelected: { backgroundColor: colors.surface.light },
  choiceChipText: { ...type.label, color: colors.text.primary },
  choiceChipTextSelected: { color: colors.text.ink },
  consequence: { ...type.caption, color: colors.text.secondary, textAlign: 'center' },
  doneNote: { ...type.caption, color: colors.text.secondary, marginTop: space[3], textAlign: 'center' },
  eyebrow: { ...type.micro, color: colors.brand.signatureAmber, textAlign: 'center', textTransform: 'uppercase' },
  eyebrowLight: { color: colors.brand.burnt },
  footerActions: { gap: space[1] },
  hero: { alignSelf: 'center', height: 168, marginBottom: space[2], width: 190 },
  heroDone: { height: 196, width: 220 },
  heroLock: { marginBottom: space[2] },
  heroValue: { ...type.heroMd, color: colors.text.primary, textAlign: 'center' },
  inkSecondary: { color: colors.text.ink, opacity: 0.68 },
  inkText: { color: colors.text.ink },
  groupLabel: { ...type.micro, color: colors.text.secondary, marginTop: space[2] },
  listBlock: { gap: space[2], marginTop: space[4] },
  main: { flex: 1, gap: space[3], justifyContent: 'center', paddingBottom: space[8], paddingTop: space[6] },
  modalActions: { gap: space[2], marginTop: space[3] },
  modalBackdrop: { alignItems: 'center', backgroundColor: colors.surface.scrim, flex: 1, justifyContent: 'center', padding: space[5] },
  modalBody: { ...type.body, color: colors.text.ink, opacity: 0.74 },
  modalCard: { backgroundColor: colors.surface.light, borderRadius: radius.cardLarge, gap: space[3], maxWidth: 390, padding: space[5], width: '100%' },
  modalEyebrow: { ...type.micro, color: colors.brand.burnt, textTransform: 'uppercase' },
  modalTitle: { ...type.sheetTitle, color: colors.text.ink },
  progressFill: { backgroundColor: colors.surface.light, borderRadius: radius.pill, height: 4 },
  progressFillLight: { backgroundColor: colors.brand.primary },
  progressTrack: { backgroundColor: colors.surface.trackDark, borderRadius: radius.pill, height: 4, marginTop: space[2], overflow: 'hidden' },
  progressTrackLight: { backgroundColor: colors.asset.clayShade },
  repairBody: { ...type.caption, color: colors.text.secondary },
  repairCard: { backgroundColor: colors.surface.cardElevated, borderRadius: radius.card, gap: space[2], padding: space[4] },
  repairTitle: { ...type.cardTitle, color: colors.text.primary },
  rangeHint: { ...type.caption, color: colors.text.tertiary, textAlign: 'center' },
  searchInput: { ...type.body, backgroundColor: colors.surface.cardElevated, borderRadius: radius.actionRow, color: colors.text.primary, minHeight: 48, paddingHorizontal: space[4] },
  searchInputLight: { backgroundColor: colors.surface.ivoryBlur, color: colors.text.ink },
  selectionCount: { ...type.label, color: colors.text.secondary, textAlign: 'right' },
  stepper: { alignItems: 'center', flexDirection: 'row', gap: space[4], justifyContent: 'center' },
  stepperButton: { alignItems: 'center', backgroundColor: colors.surface.light, borderRadius: radius.pill, height: 48, justifyContent: 'center', width: 48 },
  stepperButtonText: { ...type.sectionTitle, color: colors.text.ink },
  stepperValue: { ...type.sectionTitle, color: colors.text.primary, minWidth: 112, textAlign: 'center' },
  title: { ...type.screenLarge, color: colors.text.primary, textAlign: 'center' },
});
