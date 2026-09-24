import { useMemo } from 'react';
import { StyleSheet, Text as NativeText, TextProps, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import Animated, {
  SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';
import { tokens as t } from '../../../design-system/tokens';
import { illustrationTokens as art } from '../../../design-system/illustrationTokens';
import { motionFor } from '../../../motion/useMotion';
import { DemoState, Scenario, snapshot } from './model';
import { demoRows } from './layout';
const ScanArc = Animated.createAnimatedComponent(Circle);
// The phone is a decorative miniature, not a second accessible interface.
function Text(props: TextProps) {
  return <NativeText {...props} allowFontScaling={false} style={[{ fontFamily: t.font.regular }, props.style]} />;
}
const note = 'M42 4c1 9 6 14 15 15v12c-6 0-11-2-15-5v23c0 12-9 20-20 20S2 61 2 50s9-20 20-20h5v12h-5a8 8 0 1 0 8 8V4Z';
function TikTokMark() {
  return (
    <Svg width={52} height={60} viewBox="-2 -2 66 74">
      <Path d={note} fill={art.demo.cyan} transform="translate(-2.2,-2.2)" />
      <Path d={note} fill={art.demo.red} transform="translate(2.2,2.2)" />
      <Path d={note} fill={t.text.onAccent} />
    </Svg>
  );
}
export function ClayLock() {
  return (
    <Svg width={34} height={34} viewBox="0 0 256 256">
      <Path
        fill={t.brand.primary}
        d="M71.2 106.4V72.2a56.8 56.8 0 0 1 113.6 0v34.2h-30V72.2a26.8 26.8 0 0 0-53.6 0v34.2z"
      />
      <Rect fill={t.brand.primary} x={33.3} y={102.4} width={189.4} height={153.6} rx={36} />
      <Circle fill={t.surface.topTint} cx={128} cy={162.4} r={17} />
      <Rect fill={t.surface.topTint} x={119} y={171.4} width={18} height={40} rx={9} />
    </Svg>
  );
}
export function Phone({
  clock,
  scenario,
  reduced,
  frame,
}: {
  clock: SharedValue<DemoState>;
  scenario: Scenario;
  reduced: boolean;
  frame: ReturnType<typeof snapshot>;
}) {
  const scanArc = useAnimatedProps(() => ({ strokeDashoffset: 264 * (1 - snapshot(clock.value, scenario).p) }));
  const { timing } = useMemo(() => motionFor(reduced), [reduced]);
  const shieldAlpha = useDerivedValue(() => timing(snapshot(clock.value, scenario).phone === 'shield' ? 1 : 0, 'standard'));
  const shield = useAnimatedStyle(() => ({ opacity: shieldAlpha.value }));
  const xl = useAnimatedStyle(() => ({ opacity: snapshot(clock.value, scenario).phone === 'excerlock' ? 1 : 0 }));
  const splash = useAnimatedStyle(() => {
    const state = snapshot(clock.value, scenario);
    return {
      opacity:
        state.phone === 'tiktok' && !['leave', 'unlocked'].includes(state.phase)
          ? Math.max(0, Math.min(1, (1.3 - state.local) / 0.3))
          : state.phone === 'tiktok' && state.phase === 'unlocked' && scenario.kind !== 'gym-minutes'
            ? Math.max(0, Math.min(1, (1.3 - state.local) / 0.3))
            : 0,
    };
  });
  const spinner = useAnimatedStyle(() => {
    const state = snapshot(clock.value, scenario);
    return {
      opacity:
        state.phone === 'tiktok' &&
        state.local < 1.9 &&
        state.phase !== 'leave' &&
        !(scenario.kind === 'gym-minutes' && state.phase === 'unlocked')
          ? Math.min(1, (1.9 - state.local) / 0.2)
          : 0,
      transform: [{ rotate: `${clock.value.time * 400}deg` }],
    };
  });
  return (
    <View style={styles.phone}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: art.demo.video }]}>
        <View style={styles.videoSubject} />
        <View style={styles.tabs}>
          <Text style={styles.tab}>Following</Text>
          <Text style={[styles.tab, { color: t.text.onAccent, borderBottomWidth: 2, borderColor: t.text.onAccent }]}>For You</Text>
        </View>
        <View style={styles.rail}>
          <View style={styles.avatar} />
          {['♥', '●', '▮', '↗'].map((glyph, i) => (
            <View key={glyph} style={{ alignItems: 'center' }}>
              <Text style={{ color: t.text.onAccent, ...art.miniature.glyph }}>{glyph}</Text>
              <Text style={{ color: t.text.onAccent, ...art.miniature.count }}>{['128K', '2,431', '9,870', 'Share'][i]}</Text>
            </View>
          ))}
        </View>
        <View style={styles.caption}>
          {[52, 100, 70].map((width, i) => (
            <View
              key={width}
              style={{
                width,
                height: i ? 6 : 8,
                borderRadius: t.radius.pill,
                backgroundColor: t.text.onAccent,
                opacity: i ? 0.55 : 1,
              }}
            />
          ))}
        </View>
        <View style={styles.bottomTabs}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={{
                width: i === 2 ? 26 : 14,
                height: i === 2 ? 18 : 14,
                borderRadius: art.corner.glyph,
                backgroundColor: t.text.onAccent,
                opacity: i === 2 ? 1 : 0.55,
              }}
            />
          ))}
        </View>
      </View>
      <Animated.View style={[styles.splash, splash]}>
        <TikTokMark />
        <Text style={{ color: t.text.onAccent, ...art.miniature.wordmark }}>TikTok</Text>
      </Animated.View>
      <Animated.View style={[styles.spinner, spinner]} />
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: t.surface.topTint }, shield]}>
        <View style={styles.shieldContent}>
          <ClayLock />
          <Text style={styles.shieldTitle}>Apps locked. Complete your exercise condition to unlock.</Text>
          <Text style={styles.shieldBody}>Open ExcerLock to manually trigger a detection.</Text>
        </View>
        <View style={styles.close}>
          <Text style={styles.closeText}>Close</Text>
        </View>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, xl]}>
        <LinearGradient
          colors={t.surface.orangeGradient}
          style={[StyleSheet.absoluteFill, { alignItems: 'center', paddingTop: 40, paddingHorizontal: 12 }]}>
          <View style={styles.scanTile}>
            {frame.phase === 'scan' ? (
              <>
                <Svg width={96} height={96} viewBox="0 0 96 96">
                  <Circle cx={48} cy={48} r={42} fill={t.surface.card} stroke={t.border.divider} strokeWidth={8} />
                  <G rotation={-90} origin="48,48">
                    <ScanArc
                      animatedProps={scanArc}
                      cx={48}
                      cy={48}
                      r={42}
                      fill="none"
                      stroke={t.brand.primary}
                      strokeWidth={8}
                      strokeDasharray={264}
                    />
                  </G>
                </Svg>
                <Text style={styles.scanPercent}>{Math.round(frame.p * 100)}%</Text>
              </>
            ) : (
              <Svg width={60} height={60} viewBox="0 0 24 24">
                <Circle cx={14} cy={4} r={2} fill={t.brand.primary} />
                <Path d="m8 22 3-13 4 5v8M6 14v-4l5-3 5 5h4" fill="none" stroke={t.brand.primary} strokeWidth={2} />
              </Svg>
            )}
          </View>
          <Text style={styles.xlTitle}>
            {frame.phase === 'scan' ? 'Reading your stride' : 'Prop your phone and walk'}
          </Text>
          <Text style={styles.xlBody}>
            {frame.phase === 'scan'
              ? 'Keep walking. A few seconds.'
              : "Set it upright facing you. The scan starts on its own once you're walking."}
          </Text>
          {frame.phase !== 'scan' ? (
            <View style={styles.close}>
              <Text style={styles.closeText}>I’m walking</Text>
            </View>
          ) : null}
        </LinearGradient>
      </Animated.View>
      <Text style={[styles.time, { color: frame.phone === 'tiktok' ? t.text.onAccent : t.text.primary }]}>9:41</Text>
      <View style={[styles.home, { backgroundColor: frame.phone === 'tiktok' ? t.text.onAccent : t.text.primary }]} />
    </View>
  );
}
const styles = StyleSheet.create({
  phone: {
    position: 'absolute',
    right: 14,
    top: demoRows.column,
    width: 170,
    height: demoRows.columnHeight,
    borderRadius: art.corner.phone,
    backgroundColor: t.surface.card,
    overflow: 'hidden',
    boxShadow: art.demo.shadow,
  },
  time: { position: 'absolute', top: 8, alignSelf: 'center', ...art.miniature.status },
  home: { position: 'absolute', bottom: 6, alignSelf: 'center', width: 56, height: 4, borderRadius: t.radius.pill },
  videoSubject: {
    position: 'absolute',
    left: '18%',
    right: '34%',
    top: '38%',
    bottom: '32%',
    borderRadius: art.corner.blob,
    backgroundColor: art.demo.videoSubject,
  },
  tabs: { position: 'absolute', top: 32, alignSelf: 'center', flexDirection: 'row', gap: 8 },
  tab: { ...art.miniature.status, color: art.demo.tabInactive },
  rail: { position: 'absolute', bottom: 74, right: 10, gap: 8, alignItems: 'center' },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: t.radius.pill,
    borderWidth: 2,
    borderColor: t.text.onAccent,
    backgroundColor: art.demo.avatar,
  },
  caption: { position: 'absolute', bottom: 44, left: 12, gap: 5 },
  bottomTabs: {
    position: 'absolute',
    bottom: 18,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  splash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: art.demo.black,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  spinner: {
    position: 'absolute',
    top: 143,
    left: 72,
    width: 26,
    height: 26,
    borderRadius: t.radius.pill,
    borderWidth: 3,
    borderColor: t.surface.card,
    borderTopColor: t.text.onAccent,
  },
  shieldContent: { marginTop: 78, paddingHorizontal: 14, alignItems: 'center', gap: 8 },
  shieldTitle: { color: t.text.primary, textAlign: 'center', ...art.miniature.shieldTitle },
  shieldBody: { color: t.text.secondary, textAlign: 'center', ...art.miniature.shieldBody },
  close: {
    position: 'absolute',
    bottom: 22,
    left: 16,
    right: 16,
    height: 28,
    borderRadius: t.radius.pill,
    backgroundColor: t.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: t.text.onAccent, ...art.miniature.button },
  scanTile: {
    width: 96,
    height: 96,
    borderRadius: art.corner.tile,
    backgroundColor: t.surface.topTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanPercent: { position: 'absolute', color: t.text.primary, ...art.miniature.percent },
  xlTitle: {
    color: t.text.primary,
    marginTop: 12,
    ...art.miniature.title,
    textAlign: 'center',
  },
  xlBody: { color: t.text.secondary, marginTop: 8, ...art.miniature.body, textAlign: 'center' },
});
