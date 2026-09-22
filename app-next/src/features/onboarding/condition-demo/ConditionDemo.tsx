import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Pressable, StyleSheet, Text as NativeText, TextProps, View, useWindowDimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { useLocalSearchParams } from 'expo-router';
import { diagnosticsRoutesEnabled } from '../../../runtime/diagnosticsRoutes';
import { demoTestControl, DemoTestQuery } from './testingPort';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { tokens as t } from '../../../design-system/tokens';
import { illustrationTokens as art } from '../../../design-system/illustrationTokens';
import { BackButton } from '../../../design-system/BackButton';
import { conditionDemoTokens as c } from '../../../design-system/conditionDemoTokens';
import { useMotion } from '../../../motion/useMotion';
import { feedback } from '../../../motion/haptics';
import { Confetti } from '../../../motion/Confetti';
import { RuleDraft } from '../../rules/draft';
import { Schedule } from '../../../domain/types';
import { Answers } from '../../../onboarding/types';
import { profileStore as useProfileStore } from '../../../state/profileStore';
import { settingsStore as useSettingsStore } from '../../../state/settingsStore';
import { advanceDemo, beginHold, endHold, initialDemo, phasesFor, scenarioFor, snapshot } from './model';
import { Character } from './Character';
import { World, Treadmill } from './World';
import { GymMap } from './GymMap';
import { Phone } from './Phone';
import { sceneGeometry } from './layout';

function Text(props: TextProps) {
  return <NativeText {...props} style={[{ fontFamily: t.font.regular }, props.style]} />;
}

const HoldArc = Animated.createAnimatedComponent(Circle);
/** An illustration only: never starts detection, changes permission state or grants access. */
export function ConditionDemo({
  draft,
  schedule,
  answers,
  onBack,
}: {
  draft: RuleDraft;
  schedule: Schedule;
  answers: Answers;
  onBack: () => void;
}) {
  const places = useProfileStore((s) => s.data.walkPlaces.join(','));
  const scenario = useMemo(() => scenarioFor(draft, places), [draft, places]);
  const query = useLocalSearchParams<DemoTestQuery>();
  const control = demoTestControl(
    diagnosticsRoutesEnabled(Constants.expoConfig?.extra?.environment, __DEV__),
    query,
    phasesFor(scenario).reduce((sum, phase) => sum + phase.duration, 0),
  );
  // A different draft or preview seek starts a fresh, deterministic scene.
  return (
    <DemoScene
      key={`${scenario.kind}:${scenario.place}:${scenario.goal}:${control?.time}:${control?.paused}`}
      {...{ scenario, control, onBack }}
    />
  );
}
function DemoScene({
  scenario,
  control,
  onBack,
}: {
  scenario: ReturnType<typeof scenarioFor>;
  control: ReturnType<typeof demoTestControl>;
  onBack: () => void;
}) {
  const { reduced: initialReduced } = useMotion();
  const [reduced, setReduced] = useState(initialReduced);
  useEffect(() => {
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => subscription.remove();
  }, []);
  const { fontScale, height: windowHeight } = useWindowDimensions();
  const initial = advanceDemo(initialDemo(), scenario, control?.time ?? 0);
  const clock = useSharedValue(initial);
  const running = useSharedValue(AppState.currentState === 'active');
  const ready = useSharedValue(scenario.kind.startsWith('gym'));
  const lastPublish = useSharedValue(0);
  const [frame, setFrame] = useState(() => snapshot(initial, scenario));
  const [dimensions, setDimensions] = useState({ width: 354, height: 430 });
  const [burst, setBurst] = useState(0);
  const [holdFocused, setHoldFocused] = useState(false);
  const loaded = useRef(0);
  const accessibilityRelease = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gym = useSettingsStore((s) => s.data.gymPlaces[0]);
  const gymName = gym?.name ?? 'West Loop Fitness';
  const publish = useCallback((next: ReturnType<typeof snapshot>, celebrate: boolean) => {
    setFrame(next);
    if (celebrate) {
      setBurst((n) => n + 1);
      feedback('success');
    }
  }, []);
  const animation = useFrameCallback((info) => {
    if (!running.value || !ready.value || (control?.paused && !clock.value.manual)) return;
    const before = snapshot(clock.value, scenario);
    clock.value = advanceDemo(clock.value, scenario, Math.min(0.1, (info.timeSincePreviousFrame ?? 0) / 1000));
    const next = snapshot(clock.value, scenario);
    if (before.phase !== next.phase || info.timestamp - lastPublish.value >= 100) {
      lastPublish.value = info.timestamp;
      scheduleOnRN(publish, next, !before.goalMet && next.goalMet);
    }
  });
  const release = useCallback(() => {
    if (accessibilityRelease.current) clearTimeout(accessibilityRelease.current);
    accessibilityRelease.current = null;
    clock.set(endHold(clock.get()));
    setFrame(snapshot(clock.value, scenario));
    feedback('selection');
  }, [clock, scenario]);
  const hold = () => {
    const before = snapshot(clock.value, scenario);
    clock.set(beginHold(clock.get(), scenario));
    publish(snapshot(clock.value, scenario), before.locked);
    feedback('press');
  };
  useEffect(() => {
    animation.setActive(true);
    const subscription = AppState.addEventListener('change', (state) => {
      running.value = state === 'active';
      if (state !== 'active') release();
    });
    return () => {
      subscription.remove();
      animation.setActive(false);
      if (accessibilityRelease.current) clearTimeout(accessibilityRelease.current);
    };
  }, [animation, release, running]);
  const onLoad = useCallback(() => {
    loaded.current += 1;
    if (loaded.current >= 8) ready.set(true);
  }, [ready]);
  const holdFill = useAnimatedStyle(() => ({ width: clock.value.manual === 'walking' ? '100%' : '0%' }));
  const goalFill = useAnimatedStyle(() => ({ width: `${snapshot(clock.value, scenario).progressFraction * 100}%` }));
  const holdArc = useAnimatedProps(() => ({ strokeDashoffset: clock.value.manual === 'walking' ? 0 : 69.12 }));
  const isGym = scenario.kind.startsWith('gym');
  const unlockPromise = scenario.kind === 'walk-steps'
    ? `Once you hit ${scenario.goal.toLocaleString('en-US')} steps, your apps will unlock.`
    : scenario.kind === 'walk-minutes'
      ? `Once you walk for ${scenario.goal} minutes, your apps will unlock.`
      : scenario.kind === 'walk-state'
        ? 'Once you start walking, your apps will unlock.'
        : scenario.kind === 'gym-minutes'
          ? `Once you spend ${scenario.goal} minutes at the gym, your apps will unlock.`
          : 'Once you arrive at the gym, your apps will unlock.';
  const goalCard =
    scenario.kind === 'walk-steps' ||
    scenario.kind === 'walk-minutes' ||
    (scenario.kind === 'gym-minutes' && ['counting', 'unlocked', 'leave'].includes(frame.phase));
  // A single scene coordinate space keeps both columns disjoint at every width.
  const geometry = sceneGeometry(dimensions.width, dimensions.height);
  const { scale } = geometry;
  const unit = scenario.kind === 'walk-steps' ? 'steps' : 'min';
  const mapTitle =
    frame.phase === 'approach'
      ? 'Walking to the gym'
      : frame.phase === 'confirming'
        ? "Confirming you're here"
        : frame.phase === 'counting'
          ? 'Your gym time is counting'
          : frame.phase === 'leave'
            ? 'Leaving the gym'
            : 'Location detected at the gym';
  const mapBody =
    frame.phase === 'approach'
      ? `Arrival radius: ${gym?.radiusMeters ?? 100} m around ${gymName}`
      : frame.phase === 'confirming'
        ? 'Stay put for a moment.'
        : frame.phase === 'counting'
          ? `Leaving before ${scenario.goal} min locks your apps again`
          : frame.phase === 'leave'
            ? 'Today stays unlocked'
            : `You're at ${gymName}.`;
  return (
    <View key={fontScale} style={styles.root} testID="condition-demo">
      <View
        testID={`condition-demo-${scenario.kind}-${scenario.place}-${frame.phase}-${frame.phone}-${frame.locked ? 'locked' : 'unlocked'}`}
        style={[styles.stage, { minHeight: windowHeight < 740 ? 520 : 650 }]}
        onLayout={(event) => setDimensions(event.nativeEvent.layout)}>
        <LinearGradient colors={c.sky} style={StyleSheet.absoluteFill} />
        <View accessible accessibilityLiveRegion="polite"
          accessibilityLabel={`${unlockPromise} ${frame.title}. ${frame.caption}`}
          style={styles.liveRegion} />
        <View style={styles.promise}>
          <View style={styles.promiseBack}>
            <BackButton onPress={onBack} />
          </View>
          <Text maxFontSizeMultiplier={1} style={styles.promiseText}>{unlockPromise}</Text>
        </View>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={StyleSheet.absoluteFill}>
          <World clock={clock} />
          <View
            style={{
              position: 'absolute',
              top: geometry.top,
              left: geometry.left,
              width: 400,
              height: geometry.height,
              transformOrigin: 'top left',
              transform: [{ scale }],
            }}>
            {scenario.place === 'treadmill' ? <Treadmill clock={clock} /> : null}
            {isGym ? <GymMap {...{ clock, scenario }} /> : <Character {...{ clock, scenario, reduced, onLoad }} />}
            <Phone {...{ clock, scenario, reduced, frame }} />
            {goalCard ? (
              <View style={[styles.info, { top: 150 }]}>
                <Text maxFontSizeMultiplier={1} style={styles.small}>{frame.goalMet ? 'GOAL REACHED' : isGym ? 'AT THE GYM' : 'TODAY'}</Text>
                <Text maxFontSizeMultiplier={1} style={styles.number}>
                  {frame.progress.toLocaleString('en-US')}
                  <Text maxFontSizeMultiplier={1} style={styles.small}>
                    {' '}
                    / {scenario.goal.toLocaleString('en-US')} {unit}
                  </Text>
                </Text>
                <View style={styles.track}>
                  <Animated.View style={[styles.fill, goalFill]} />
                </View>
              </View>
            ) : null}
            {isGym ? (
              <View style={styles.mapCaption}>
                <Text maxFontSizeMultiplier={1} style={styles.mapTitle}>{mapTitle}</Text>
                <Text maxFontSizeMultiplier={1} style={styles.mapBody}>{mapBody}</Text>
              </View>
            ) : null}
          </View>
        </View>
        {burst > 0 && !reduced ? <Confetti key={burst} width={dimensions.width} /> : null}
      </View>
      {scenario.kind === 'walk-state' ? (
        <Pressable
          testID="condition-demo-hold"
          accessibilityRole="button"
          accessibilityLabel="Continue walking. Press and hold to walk. Release to stop."
          accessibilityValue={{
            text:
              frame.manual === 'walking'
                ? 'Walking. Apps open.'
                : frame.manual === 'blocked'
                  ? 'Stopped. Apps blocked.'
                  : 'Hold to try walking.',
          }}
          accessibilityActions={[{ name: 'activate' }]}
          onAccessibilityAction={() => {
            if (clock.value.manual === 'walking') release();
            else {
              hold();
              accessibilityRelease.current = setTimeout(release, 3000);
            }
          }}
          onPressIn={hold}
          onPressOut={release}
          onFocus={() => setHoldFocused(true)}
          onBlur={() => {
            setHoldFocused(false);
            release();
          }}
          style={[
            styles.hold,
            {
              backgroundColor: frame.manual === 'walking' ? t.brand.primary : t.surface.card,
              outlineColor: t.brand.primary,
              outlineOffset: 2,
              outlineWidth: holdFocused ? 3 : 0,
            },
          ]}>
          <Animated.View testID="condition-demo-hold-fill" pointerEvents="none" style={[styles.holdProgress, holdFill]} />
          <View style={styles.holdRing}>
            <Svg width={26} height={26} viewBox="0 0 26 26">
              <Circle cx={13} cy={13} r={11} stroke={t.border.divider} strokeWidth={4} fill={t.surface.card} />
              <HoldArc
                animatedProps={holdArc}
                cx={13}
                cy={13}
                r={11}
                stroke={t.brand.primary}
                strokeWidth={4}
                fill="none"
                strokeDasharray={69.12}
                transform="rotate(-90 13 13)"
              />
            </Svg>
          </View>
          <View style={{ flexDirection: fontScale > 1.3 ? 'column' : 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.holdTitle, { color: frame.manual === 'walking' ? t.text.onAccent : t.text.primary }]}>
              {frame.manual === 'walking'
                ? 'Walking · apps open'
                : frame.manual === 'blocked'
                  ? 'Stopped · blocked'
                  : 'Continue walking'}
            </Text>
            <Text style={[styles.holdHint, { color: frame.manual === 'walking' ? t.text.onAccent : t.text.secondary }]}>
              {frame.manual === 'walking'
                ? `${Math.floor(frame.local)} s`
                : frame.manual === 'blocked'
                  ? 'hold to walk again'
                  : 'hold to walk'}
            </Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flexGrow: 1 },
  stage: { flex: 1, minHeight: 650, overflow: 'hidden' },
  liveRegion: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  promise: {
    position: 'absolute',
    top: 70,
    left: 14,
    right: 14,
    height: 72,
    borderRadius: t.radius.card,
    paddingHorizontal: 58,
    backgroundColor: t.surface.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: c.shadow,
    zIndex: 10,
  },
  promiseBack: {
    position: 'absolute',
    left: 8,
    top: 14,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  promiseText: { flex: 1, ...t.type.label, color: t.text.primary, textAlign: 'center' },
  info: {
    position: 'absolute',
    left: 14,
    width: 170,
    borderRadius: 18,
    padding: 12,
    backgroundColor: t.surface.card,
    boxShadow: c.shadow,
  },
  small: { ...art.scene.caption, color: t.text.secondary },
  number: {
    ...art.scene.value,
    color: t.text.primary,
    fontVariant: ['tabular-nums'],
    marginTop: 3,
  },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: t.border.divider, marginTop: 8 },
  fill: { height: '100%', backgroundColor: t.brand.primary, borderRadius: 4 },
  mapCaption: {
    position: 'absolute',
    left: 14,
    bottom: 50,
    width: 170,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: t.surface.card,
  },
  mapTitle: { ...art.scene.title, color: t.text.primary },
  mapBody: { ...art.scene.body, color: t.text.secondary },
  hold: {
    minHeight: 54,
    paddingVertical: 12,
    paddingHorizontal: 42,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: t.border.outline,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  holdTitle: { ...t.type.label, textAlign: 'center' },
  holdHint: { ...t.type.support, textAlign: 'center' },
  holdProgress: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: t.brand.primary },
  holdRing: {
    position: 'absolute',
    left: 12,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: t.surface.transparent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
