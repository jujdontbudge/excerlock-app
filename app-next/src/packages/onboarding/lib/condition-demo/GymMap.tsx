import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import Animated, { SharedValue, useAnimatedProps } from 'react-native-reanimated';
import { tokens as t } from '../../../ui/tokens';
import { illustrationTokens as art } from '../../../ui/illustrationTokens';
import { DemoState, Scenario, snapshot } from './model';
import { demoRows } from './layout';
const Group = Animated.createAnimatedComponent(G<{ matrix?: number[] }>);
const Ring = Animated.createAnimatedComponent(Circle);
export function GymMap({ clock, scenario }: { clock: SharedValue<DemoState>; scenario: Scenario }) {
  const dot = useAnimatedProps(() => {
    const distance = snapshot(clock.value, scenario).mapFraction * 216;
    const x = distance < 96 ? 40 : distance < 174 ? 40 + distance - 96 : 118;
    const y = distance < 96 ? 306 - distance : distance < 174 ? 210 : 210 - (distance - 174);
    return { matrix: [1, 0, 0, 1, x, y] };
  });
  const ring = useAnimatedProps(() => {
    const state = snapshot(clock.value, scenario);
    return { opacity: state.phase === 'confirming' ? 1 : 0, strokeDashoffset: 163.4 * (1 - state.p) };
  });
  const pulse = useAnimatedProps(() => ({
    r: 10 + 14 * (clock.value.time % 1),
    opacity: snapshot(clock.value, scenario).phase === 'confirming' ? 0.2 : 0,
  }));
  const check = useAnimatedProps(() => ({
    opacity: ['counting', 'unlocked'].includes(snapshot(clock.value, scenario).phase) ? 1 : 0,
  }));
  return (
    <View style={styles.map}>
      <Svg width={170} height={demoRows.columnHeight} viewBox="0 0 170 328">
        <Rect width={170} height={328} fill={art.demo.map} />
        {[12, 132, 236].map((y) => (
          <G key={y}>
            <Rect x={-8} y={y} width={38} height={64} rx={8} fill={art.demo.block} />
            <Rect x={58} y={y} width={34} height={62} rx={6} fill={art.demo.building} />
            <Rect x={108} y={y} width={64} height={62} rx={8} fill={art.demo.block} />
          </G>
        ))}
        <Rect x={104} y={118} width={62} height={70} rx={8} fill={art.demo.gym} />
        <Rect x={116} y={144} width={36} height={8} rx={3} fill={t.surface.card} />
        <Rect x={108} y={236} width={62} height={92} rx={8} fill={art.demo.park} />
        {[124, 150].map((x) => (
          <Circle key={x} cx={x} cy={280} r={18} fill={art.demo.parkTree} />
        ))}
        <Path d="M41 0V328 M0 111H170 M0 210H170" stroke={t.surface.card} strokeWidth={22} />
        <Path d="M100 111V210" stroke={t.surface.card} strokeWidth={8} />
        <Path d="M41 0V328 M0 111H170 M0 210H170" stroke={art.demo.block} strokeWidth={1} strokeDasharray="4 5" />
        <Circle
          cx={132}
          cy={148}
          r={58}
          fill={art.demo.radius}
          stroke={t.brand.primary}
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <G transform="translate(132,130)">
          <Path d="M0 16C-5 9-14 1-14-7a14 14 0 0 1 28 0C14 1 5 9 0 16Z" fill={t.brand.primary} />
          <Circle cy={-6} r={9} fill={t.surface.card} />
          <Path d="M-6-6H6M-5-10V-2M5-10V-2" stroke={t.brand.primary} strokeWidth={2} />
        </G>
        <Group animatedProps={dot}>
          <Circle r={18} fill={art.demo.locationHalo} />
          <Ring animatedProps={pulse} fill={art.demo.location} />
          <Ring
            animatedProps={ring}
            r={26}
            fill="none"
            stroke={art.demo.location}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray="163.4"
            transform="rotate(-90)"
          />
          <Circle r={8} fill={art.demo.location} stroke={t.surface.card} strokeWidth={3} />
          <Group animatedProps={check}>
            <Circle cy={-34} r={16} fill={t.brand.primary} />
            <Path d="M-7-34l5 5 9-10" stroke={t.text.onAccent} strokeWidth={3.5} fill="none" strokeLinecap="round" />
          </Group>
        </Group>
      </Svg>
    </View>
  );
}
const styles = StyleSheet.create({
  map: {
    position: 'absolute',
    left: 14,
    top: demoRows.column,
    width: 170,
    height: demoRows.columnHeight,
    borderRadius: art.corner.phone,
    overflow: 'hidden',
    backgroundColor: art.demo.map,
    boxShadow: art.demo.shadow,
  },
});
