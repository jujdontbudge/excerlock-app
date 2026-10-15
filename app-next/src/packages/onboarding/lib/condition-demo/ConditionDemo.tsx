import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, StyleSheet, Text as NativeText, TextProps, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { useLocalSearchParams } from 'expo-router';
import { diagnosticsRoutesEnabled } from '../../../platform/diagnosticsRoutes';
import { demoTestControl, DemoTestQuery } from './testingPort';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { tokens as t } from '../../../ui/tokens';
import { capShift } from '../../../ui/Label';
import { illustrationTokens as art } from '../../../ui/illustrationTokens';
import { PressableScale } from '../../../ui/PressableScale';
import { BackButton } from '../../../ui/BackButton';
import { useMotion } from '../../../ui/useMotion';
import { haptic } from '../../../ui/haptics';
import { freshDemoCues, nextDemoCue } from './demoHaptics';
import { Confetti } from '../../../ui/Confetti';
import { RuleDraft } from '../../../conditions/draft';
import { Schedule } from '../../../model/types';
import { Answers } from '../../../model/answers';
import { profileStore as useProfileStore } from '../../../preferences/profileStore';
import { settingsStore as useSettingsStore } from '../../../preferences/settingsStore';
import type { DemoState } from './model';
import { advanceDemo, BankRuleMode, bankScenarioFor, beginHold, endHold, initialDemo, isBank, phasesFor, readyAfter, Scenario, scenarioFor, snapshot } from './model';
import { BankPhone } from './BankPhone';
import { BankFlight } from './BankFlight';
import { Cast, Character } from './Character';
import { World, Treadmill } from './World';
import { GymMap } from './GymMap';
import { Phone } from './Phone';
import { bankGeometry, bankHeroToken, bankPhoneWidth, bankRows, demoRows, promiseCard, sceneGeometry } from './layout';

function Text(props: TextProps) {
  const { fontScale } = useWindowDimensions();
  const flat = StyleSheet.flatten(props.style);
  const shift = capShift(flat?.fontSize ?? t.type.support.fontSize, flat?.lineHeight ?? Infinity) * Math.min(fontScale, props.maxFontSizeMultiplier ?? Infinity);
  return <NativeText {...props} style={[{ fontFamily: t.font.regular }, props.style, { transform: [{ translateY: shift }] }]} />;
}

export function ConditionDemo({
  draft,
  schedule,
  answers,
  onBack,
  onReady,
  bank,
}: {
  draft: RuleDraft;
  schedule: Schedule;
  answers: Answers;
  onBack: () => void;
  onReady: () => void;
  bank?: BankRuleMode;
}) {
  const places = useProfileStore((s) => s.data.walkPlaces.join(','));
  const bankActivity = bank?.activity;
  const scenario = useMemo(
    () => (bankActivity ? bankScenarioFor(bankActivity) : scenarioFor(draft, places)),
    [bankActivity, draft, places],
  );
  return <ScenarioDemo {...{ scenario, onBack, onReady }} cast={answers.gender === 'female' ? 'girl' : 'boy'} />;
}
export function BankConditionDemo({
  mode,
  cast,
  onBack,
  onReady,
}: {
  mode: BankRuleMode;
  cast: Cast;
  onBack: () => void;
  onReady: () => void;
}) {
  const scenario = useMemo(() => bankScenarioFor(mode.activity), [mode.activity]);
  return <ScenarioDemo {...{ scenario, cast, onBack, onReady }} />;
}
function ScenarioDemo({
  scenario,
  cast,
  onBack,
  onReady,
}: {
  scenario: Scenario;
  cast: Cast;
  onBack: () => void;
  onReady: () => void;
}) {
  const query = useLocalSearchParams<DemoTestQuery>();
  const control = demoTestControl(
    diagnosticsRoutesEnabled(Constants.expoConfig?.extra?.environment, __DEV__),
    query,
    phasesFor(scenario).reduce((sum, phase) => sum + phase.duration, 0),
  );
  return (
    <DemoScene
      key={`${scenario.kind}:${scenario.place}:${scenario.goal}:${control?.time}:${control?.paused}`}
      {...{ scenario, control, onBack, onReady, cast }}
    />
  );
}
function DemoScene({
  scenario,
  control,
  onBack,
  onReady,
  cast,
}: {
  scenario: Scenario;
  control: ReturnType<typeof demoTestControl>;
  onBack: () => void;
  onReady: () => void;
  cast: Cast;
}) {
  const { reduced: initialReduced } = useMotion();
  const [reduced, setReduced] = useState(initialReduced);
  useEffect(() => {
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => subscription.remove();
  }, []);
  const { fontScale, height: windowHeight } = useWindowDimensions();
  const initial = advanceDemo(initialDemo(), scenario, control?.time ?? 0);
  const readyTime = readyAfter(scenario);
  const clock = useSharedValue(initial);
  const running = useSharedValue(AppState.currentState === 'active');
  const elapsed = useSharedValue(0);
  const [mountedAt] = useState(Date.now);
  const lastTick = useSharedValue(mountedAt);
  const reportedReady = useSharedValue(false);
  const lastPublish = useSharedValue(0);
  const [frame, setFrame] = useState(() => snapshot(initial, scenario));
  const [dimensions, setDimensions] = useState({ width: 354, height: 430 });
  const [burst, setBurst] = useState(0);
  const cues = useRef({ ...freshDemoCues(), lockShown: isBank(scenario) });
  const cueMode = useRef({ reduced, paused: !!control?.paused });
  useEffect(() => {
    cueMode.current = { reduced, paused: !!control?.paused };
  }, [reduced, control?.paused]);
  const gym = useSettingsStore((s) => s.data.gymPlaces[0]);
  const gymName = gym?.name ?? 'West Loop Fitness';
  const publish = useCallback((next: ReturnType<typeof snapshot>, celebrate: boolean) => {
    setFrame(next);
    if (celebrate) setBurst((n) => n + 1);
    if (!cueMode.current.paused) haptic(nextDemoCue(cues.current, next, cueMode.current.reduced));
  }, []);
  useEffect(() => {
    if (reduced || control?.paused) onReady();
  }, [reduced, control?.paused, onReady]);
  const animation = useFrameCallback((info) => {
    const now = Date.now();
    const delta = Math.max(0, (now - lastTick.value) / 1000);
    lastTick.value = now;
    if (!running.value || (control?.paused && !clock.value.manual)) return;
    const before = snapshot(clock.value, scenario);
    clock.value = advanceDemo(clock.value, scenario, delta);
    elapsed.value += delta;
    if (!reportedReady.value && elapsed.value >= readyTime) {
      reportedReady.value = true;
      scheduleOnRN(onReady);
    }
    const next = snapshot(clock.value, scenario);
    if (before.phase !== next.phase || info.timestamp - lastPublish.value >= 100) {
      lastPublish.value = info.timestamp;
      scheduleOnRN(publish, next, scenario.kind !== 'gym-presence' && !before.goalMet && next.goalMet);
    }
  });
  useEffect(() => {
    animation.setActive(true);
    const subscription = AppState.addEventListener('change', (state) => {
      lastTick.value = Date.now();
      running.value = state === 'active';
      if (state !== 'active') clock.set((value) => endHold(value, scenario));
    });
    return () => {
      subscription.remove();
      animation.setActive(false);
    };
  }, [animation, running, clock, lastTick, scenario]);
  const goalFill = useAnimatedStyle(() => ({ width: `${snapshot(clock.value, scenario).progressFraction * 100}%` }));
  const isGym = scenario.kind.startsWith('gym');
  const bank = isBank(scenario);
  const unlockPromise = scenario.kind === 'walk-bank'
    ? 'Your steps earn Points. Points buy screen time.'
    : scenario.kind === 'gym-bank'
      ? 'Gym minutes earn Points. Points buy screen time.'
      : scenario.kind === 'walk-steps'
    ? `Once you hit ${scenario.goal.toLocaleString('en-US')} steps, your apps will unlock.`
    : scenario.kind === 'walk-minutes'
      ? `Once you walk for ${scenario.goal} minutes, your apps will unlock.`
      : scenario.kind === 'walk-state'
        ? 'Once you start walking, your apps will unlock.'
        : scenario.kind === 'gym-minutes'
          ? `Once you spend ${scenario.goal} minutes at the gym, your apps will unlock.`
          : scenario.kind === 'gym-presence'
            ? "While you're at the gym, your apps stay unlocked."
            : 'Once you arrive at the gym, your apps will unlock.';
  const goalCard =
    scenario.kind === 'walk-steps' ||
    scenario.kind === 'walk-minutes' ||
    (scenario.kind === 'gym-minutes' && ['counting', 'unlocked', 'leave'].includes(frame.phase));
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
            : scenario.kind === 'gym-presence'
              ? "Unlocked while you're here"
              : 'Location detected at the gym';
  const mapBody =
    frame.phase === 'approach'
      ? `Arrival radius: ${gym?.radiusMeters ?? 100} m around ${gymName}`
      : frame.phase === 'confirming'
        ? 'Stay put for a moment.'
        : frame.phase === 'counting'
          ? `Leaving before ${scenario.goal} min locks your apps again`
          : frame.phase === 'leave'
            ? scenario.kind === 'gym-presence'
              ? 'Your apps lock again'
              : 'Today stays unlocked'
            : `You're at ${gymName}.`;
  return (
    <View key={fontScale} style={styles.root} testID="condition-demo">
      <View
        testID={`condition-demo-${scenario.kind}-${scenario.place}-${frame.phase}-${frame.phone}-${frame.locked ? 'locked' : 'unlocked'}`}
        style={[styles.stage, { minHeight: windowHeight < 740 ? 520 : 650 }]}
        onLayout={(event) => setDimensions(event.nativeEvent.layout)}>
        <LinearGradient colors={art.demo.sky} style={StyleSheet.absoluteFill} />
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
            {bank ? <BankStage {...{ clock, scenario, frame, reduced, cast }} height={geometry.height} /> : null}
            {scenario.place === 'treadmill' ? <Treadmill clock={clock} /> : null}
            {bank ? null : isGym ? <GymMap {...{ clock, scenario }} /> : <Character {...{ clock, scenario, reduced, cast }} />}
            {bank ? null : <Phone {...{ clock, scenario, frame }} />}
            {goalCard ? (
              <View style={[styles.info, isGym ? { top: demoRows.below, right: 14 } : { top: demoRows.column, left: 14 }]}>
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
            {isGym && !bank ? (
              <View style={styles.mapCaption}>
                <Text maxFontSizeMultiplier={1} style={styles.mapTitle}>{mapTitle}</Text>
                <Text maxFontSizeMultiplier={1} style={styles.mapBody}>{mapBody}</Text>
              </View>
            ) : null}
          </View>
        </View>
        {scenario.kind === 'walk-state' || scenario.kind === 'walk-bank' ? (
          <View style={styles.hold}>
            <PressableScale label="Hold to walk" haptic="none"
              onPressIn={() => { clock.set((value) => beginHold(value, scenario)); publish(snapshot(clock.get(), scenario), false); }}
              onPressOut={() => { clock.set((value) => endHold(value, scenario)); publish(snapshot(clock.get(), scenario), false); }}
              style={styles.holdButton}>
              <Text style={styles.holdLabel}>{frame.manual === 'walking' ? 'Release to stop' : 'Hold to walk'}</Text>
            </PressableScale>
          </View>
        ) : null}
        {burst > 0 && !reduced ? <Confetti key={burst} width={dimensions.width} /> : null}
      </View>
    </View>
  );
}
function BankStage({
  clock,
  scenario,
  frame,
  reduced,
  cast,
  height,
}: {
  clock: SharedValue<DemoState>;
  scenario: Scenario;
  frame: ReturnType<typeof snapshot>;
  reduced: boolean;
  cast: Cast;
  height: number;
}) {
  const gym = scenario.kind === 'gym-bank';
  const { phoneTop, phoneHeight, captionTop, walkerTransform, hand } = bankGeometry(height);
  const from = gym ? { x: 132, y: phoneTop + phoneHeight / 2 + 46 } : hand;
  const to = { x: bankRows.stageWidth - 14 - bankPhoneWidth + bankHeroToken.x, y: phoneTop + bankHeroToken.y };
  const bend = gym ? { x: 215, y: phoneTop + 10 } : { x: 175, y: phoneTop + 10 };
  return (
    <>
      {gym ? (
        <GymMap {...{ clock, scenario }} box={{ top: phoneTop, height: phoneHeight }} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { transform: walkerTransform }]}>
          <Character {...{ clock, scenario, reduced, cast }} />
        </View>
      )}
      <BankPhone {...{ clock, scenario, frame, reduced }} top={phoneTop} height={phoneHeight} />
      <View style={[styles.sceneCaption, { top: captionTop, left: 14 }]}>
        <Text maxFontSizeMultiplier={1} style={styles.mapTitle}>{gym ? 'You go to the gym' : 'You walk'}</Text>
      </View>
      <View style={[styles.sceneCaption, { top: captionTop, right: 14 }]}>
        <Text maxFontSizeMultiplier={1} style={styles.mapTitle}>You buy screen time</Text>
      </View>
      {reduced ? null : <BankFlight {...{ clock, scenario, from, bend, to }} />}
    </>
  );
}
const styles = StyleSheet.create({
  sceneCaption: {
    position: 'absolute',
    width: 170,
    height: bankRows.captionHeight,
    borderRadius: t.radius.pill,
    backgroundColor: t.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hold: { position: 'absolute', bottom: t.space.xl, alignSelf: 'center' },
  holdButton: { paddingHorizontal: t.space.xl, backgroundColor: t.surface.softChoice, borderWidth: t.stroke.hairline, borderColor: t.surface.transparent, borderRadius: t.radius.pill },
  holdLabel: { ...t.type.label, color: t.text.primary },
  root: { flexGrow: 1 },
  stage: { flex: 1, minHeight: 650, overflow: 'hidden' },
  liveRegion: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  promise: {
    position: 'absolute',
    top: promiseCard.top,
    left: 14,
    right: 14,
    height: promiseCard.height,
    borderRadius: t.radius.card,
    paddingHorizontal: 58,
    backgroundColor: t.surface.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: art.demo.shadow,
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
    width: 170,
    borderRadius: art.corner.info,
    padding: 12,
    backgroundColor: t.surface.card,
    boxShadow: art.demo.shadow,
  },
  small: { ...art.scene.caption, color: t.text.secondary },
  number: {
    ...art.scene.value,
    color: t.text.primary,
    fontVariant: ['tabular-nums'],
    marginTop: 3,
  },
  track: { height: 8, borderRadius: t.radius.pill, overflow: 'hidden', backgroundColor: t.border.divider, marginTop: 8 },
  fill: { height: '100%', backgroundColor: t.brand.primary, borderRadius: t.radius.pill },
  mapCaption: {
    position: 'absolute',
    left: 14,
    top: demoRows.below,
    width: 170,
    borderRadius: art.corner.caption,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: t.surface.card,
  },
  mapTitle: { ...art.scene.title, color: t.text.primary },
  mapBody: { ...art.scene.body, color: t.text.secondary },
});
