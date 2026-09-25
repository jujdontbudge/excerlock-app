import { useEffect } from 'react';
import { ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { tokens as t } from '../../../ui/tokens';
import { illustrationTokens as art } from '../../../ui/illustrationTokens';
import { useMotion } from '../../../ui/useMotion';
import { loopSceneCopy } from '../onboardingCopy';
import { ClayLock } from '../condition-demo/Phone';
import { stride } from '../condition-demo/model';

export const LOOP_SCENE = { width: 360, height: 350 } as const;
const figure = { left: 20, top: 20, width: 210, height: 313 };
const phone = { left: 226, top: 24, width: 124, height: 226 };
const panels = [art.demo.videoSubject, art.demo.trunk, art.demo.avatar];
const swipeBeat = 1.1;
const tendrils = [
  'M232 98 C214 84 198 104 182 98 C172 94 166 102 158 108',
  'M232 124 C216 136 200 112 184 120 C174 125 168 116 158 118',
  'M232 150 C214 166 198 140 182 146 C172 150 168 136 160 130',
];
const tendrilLength = 200;
const walkShift = 55;
const scrollFrames = [
  require('../../../../../assets/condition-demo/frames/scroll-1.png'),
  require('../../../../../assets/condition-demo/frames/scroll-2.png'),
];
const lookUp = require('../../../../../assets/condition-demo/frames/stand-ahead.png');
const walkFrames = [
  require('../../../../../assets/condition-demo/frames-free/walk-1.png'),
  require('../../../../../assets/condition-demo/frames-free/walk-2.png'),
  require('../../../../../assets/condition-demo/frames-free/walk-3.png'),
  require('../../../../../assets/condition-demo/frames-free/walk-4.png'),
  require('../../../../../assets/condition-demo/frames-free/walk-5.png'),
  require('../../../../../assets/condition-demo/frames-free/walk-6.png'),
];
const Tendril = Animated.createAnimatedComponent(Path);

type Weights = readonly [SharedValue<number>, SharedValue<number>, SharedValue<number>];

export function LoopScene({ phase, width }: { phase: number; width: number }) {
  const m = useMotion(),
    time = useSharedValue(0),
    w0 = useSharedValue(phase === 0 ? 1 : 0),
    w1 = useSharedValue(phase === 1 ? 1 : 0),
    w2 = useSharedValue(phase === 2 ? 1 : 0),
    weights: Weights = [w0, w1, w2],
    scale = width / LOOP_SCENE.width;
  useFrameCallback((info) => {
    time.set(time.get() + Math.min(0.1, (info.timeSincePreviousFrame ?? 0) / 1000));
  }, !m.reduced);
  useEffect(() => {
    w0.set(m.timing(phase === 0 ? 1 : 0, 'emphasized'));
    w1.set(m.timing(phase === 1 ? 1 : 0, 'emphasized'));
    w2.set(m.timing(phase === 2 ? 1 : 0, 'emphasized'));
  }, [phase, w0, w1, w2, m]);
  return (
    <View
      testID="loop-scene"
      accessible
      accessibilityRole="image"
      accessibilityLabel={loopSceneCopy.descriptions[phase]}
      style={{ width, height: LOOP_SCENE.height * scale, alignSelf: 'center' }}>
      <View
        style={{
          width: LOOP_SCENE.width,
          height: LOOP_SCENE.height,
          transformOrigin: 'top left',
          transform: [{ scale }],
        }}>
        <Ground time={time} weights={weights} />
        <Figure time={time} weights={weights} />
        <Tendrils time={time} weights={weights} reduced={m.reduced} />
        <MiniPhone time={time} weights={weights} />
      </View>
    </View>
  );
}

function Ground({ time, weights: [, , w2] }: { time: SharedValue<number>; weights: Weights }) {
  const baseline = figure.top + figure.height;
  const shadow = useAnimatedStyle(() => ({ transform: [{ translateX: w2.get() * walkShift }] }));
  const track = useAnimatedStyle(() => ({ opacity: w2.get() }));
  const dashes = useAnimatedStyle(() => ({ transform: [{ translateX: -((time.get() * 90) % 40) }] }));
  return (
    <>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: figure.left + 40,
            top: baseline - 8,
            width: 120,
            height: 16,
            borderRadius: t.radius.pill,
            backgroundColor: art.demo.pebble,
            opacity: 0.55,
          },
          shadow,
        ]}
      />
      <Animated.View
        style={[{ position: 'absolute', left: 16, right: 16, top: baseline + 4, height: 6, overflow: 'hidden' }, track]}>
        <Animated.View style={[{ flexDirection: 'row', gap: 22, width: LOOP_SCENE.width + 80 }, dashes]}>
          {Array.from({ length: 11 }, (_, i) => (
            <View key={i} style={{ width: 18, height: 6, borderRadius: t.radius.pill, backgroundColor: art.demo.pebble }} />
          ))}
        </Animated.View>
      </Animated.View>
    </>
  );
}

function Figure({ time, weights: [w0, w1, w2] }: { time: SharedValue<number>; weights: Weights }) {
  const move = useAnimatedStyle(() => ({ transform: [{ translateX: w2.get() * walkShift }] }));
  return (
    <Animated.View
      style={[{ position: 'absolute', left: figure.left, top: figure.top, width: figure.width, height: figure.height }, move]}>
      {scrollFrames.map((source, i) => (
        <FigureFrame
          key={`scroll-${i}`}
          source={source}
          opacity={(now) => {
            'worklet';
            const flick = Math.max(0, Math.min(1, Math.sin(now * Math.PI * 1.6) * 3));
            return w0.get() * (i === 0 ? 1 : flick);
          }}
          time={time}
        />
      ))}
      <FigureFrame source={lookUp} time={time} opacity={() => { 'worklet'; return w1.get(); }} />
      {walkFrames.map((source, i) => (
        <FigureFrame
          key={`walk-${i}`}
          source={source}
          time={time}
          opacity={(now) => {
            'worklet';
            const { first, second, mix } = stride(now);
            const own = i === first - 1 ? 1 : i === second - 1 ? mix : 0;
            return w2.get() * own;
          }}
        />
      ))}
    </Animated.View>
  );
}

function FigureFrame({
  source,
  time,
  opacity,
}: {
  source: ImageSourcePropType;
  time: SharedValue<number>;
  opacity: (now: number) => number;
}) {
  const style = useAnimatedStyle(() => ({ opacity: opacity(time.get()) }));
  return (
    <Animated.Image
      source={source}
      resizeMode="contain"
      fadeDuration={0}
      style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }, style]}
    />
  );
}

function Tendrils({ time, weights: [w0], reduced }: { time: SharedValue<number>; weights: Weights; reduced: boolean }) {
  const sway = useAnimatedStyle(() => ({
    transform: [{ rotate: `${reduced ? 0 : Math.sin(time.get() * 1.3) * 3}deg` }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { transformOrigin: `${phone.left}px ${phone.top + phone.height / 2}px` }, sway]}>
      <Svg width={LOOP_SCENE.width} height={LOOP_SCENE.height} viewBox={`0 0 ${LOOP_SCENE.width} ${LOOP_SCENE.height}`}>
        {tendrils.map((d, i) => (
          <TendrilPath key={d} d={d} index={i} grip={w0} />
        ))}
      </Svg>
    </Animated.View>
  );
}

function TendrilPath({ d, index, grip }: { d: string; index: number; grip: SharedValue<number> }) {
  const props = useAnimatedProps(() => ({ strokeDashoffset: tendrilLength * (1 - grip.get()) }));
  return (
    <Tendril
      d={d}
      fill="none"
      stroke={index % 2 ? art.demo.treeLight : t.brand.primary}
      strokeWidth={index % 2 ? 4 : 5}
      opacity={0.9}
      strokeLinecap="round"
      strokeDasharray={`${tendrilLength} ${tendrilLength}`}
      animatedProps={props}
    />
  );
}

function MiniPhone({ time, weights: [, w1, w2] }: { time: SharedValue<number>; weights: Weights }) {
  const body = useAnimatedStyle(() => ({
    opacity: 1 - w2.get(),
    transform: [{ translateX: w2.get() * 40 }, { translateY: w2.get() * 60 }, { scale: 1 - 0.45 * w2.get() }],
  }));
  const feed = useAnimatedStyle(() => {
    const beat = time.get() / swipeBeat,
      step = Math.floor(beat),
      within = Math.max(0, Math.min(1, (beat - step - 0.6) / 0.4)),
      eased = within * within * (3 - 2 * within);
    return { transform: [{ translateY: -((step + eased) % panels.length) * phone.height }] };
  });
  const shield = useAnimatedStyle(() => ({ opacity: Math.min(1, w1.get() + w2.get()) }));
  const lock = useAnimatedStyle(() => ({ transform: [{ scale: 0.6 + 0.4 * Math.min(1, w1.get() + w2.get()) }] }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: phone.left,
          top: phone.top,
          width: phone.width,
          height: phone.height,
          borderRadius: art.corner.phone,
          backgroundColor: art.demo.video,
          overflow: 'hidden',
          boxShadow: art.demo.shadow,
        },
        body,
      ]}>
      <Animated.View style={feed}>
        {[...panels, panels[0]].map((subject, i) => (
          <View key={i} style={{ width: phone.width, height: phone.height, backgroundColor: art.demo.video }}>
            <View
              style={{
                position: 'absolute',
                left: '16%',
                right: '30%',
                top: '30%',
                bottom: '34%',
                borderRadius: art.corner.blob,
                backgroundColor: subject,
              }}
            />
            <View style={{ position: 'absolute', right: 8, bottom: 52, gap: 8 }}>
              {[0, 1, 2].map((dot) => (
                <View key={dot} style={{ width: 12, height: 12, borderRadius: t.radius.pill, backgroundColor: t.text.onAccent, opacity: 0.85 }} />
              ))}
            </View>
            <View style={{ position: 'absolute', left: 10, bottom: 22, gap: 5 }}>
              {[48, 70].map((bar) => (
                <View key={bar} style={{ width: bar, height: 5, borderRadius: t.radius.pill, backgroundColor: t.text.onAccent, opacity: 0.6 }} />
              ))}
            </View>
          </View>
        ))}
      </Animated.View>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: t.surface.topTint, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 10 }, shield]}>
        <Animated.View style={lock}>
          <ClayLock />
        </Animated.View>
        <Text allowFontScaling={false} style={[art.miniature.title, { color: t.text.primary, textAlign: 'center' }]}>
          {loopSceneCopy.locked}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}
