import { StyleSheet } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import Animated, { SharedValue, useAnimatedProps } from 'react-native-reanimated';
import { tokens as t } from '../../../ui/tokens';
import { illustrationTokens as art } from '../../../ui/illustrationTokens';
import { DemoState } from './model';
const Group = Animated.createAnimatedComponent(G<{ matrix?: number[] }>);
const hill = (y: number) =>
  `M0 ${y + 30} C100 ${y - 10},100 ${y + 70},200 ${y + 30} S300 ${y + 70},400 ${y + 30} L400 400 L0 400 Z`;
function Layer({ index, clock }: { index: number; clock: SharedValue<DemoState> }) {
  const props = useAnimatedProps(() => ({
    matrix: [1, 0, 0, 1, -((clock.value.distance * [0.08, 0.18, 0.45, 1][index]) % 400), 0],
  }));
  return (
    <Group animatedProps={props}>
      {[0, 400].map((offset) => (
        <G key={offset} transform={`translate(${offset},0)`}>
          {index === 0
            ? [40, 300].map((x, i) => (
                <G key={x} transform={`translate(${x},${i ? 40 : 60})`} fill={t.text.onAccent} opacity={0.85}>
                  <Circle r={16} />
                  <Circle cx={-18} cy={5} r={12} />
                  <Circle cx={18} cy={5} r={12} />
                </G>
              ))
            : null}
          {index === 1 ? <Path d={hill(230)} fill={art.demo.farHill} /> : null}
          {index === 2 ? (
            <>
              <Path d={hill(275)} fill={art.demo.nearHill} />
              {[-60, 120, 330].map((x, i) => (
                <G key={x} transform={`translate(${x},247)`}>
                  <Rect x={-4} y={0} width={8} height={34} rx={4} fill={art.demo.trunk} />
                  <G fill={i % 2 ? art.demo.treeLight : art.demo.tree}>
                    <Circle cy={-6} r={22} />
                    <Circle cx={-19} r={14} />
                    <Circle cx={19} r={14} />
                  </G>
                </G>
              ))}
            </>
          ) : null}
          {index === 3 ? (
            <>
              <Path d={hill(318)} fill={art.demo.ground} />
              <Path d="M0 350 Q100 328 200 350 T400 350 L400 400 L0 400Z" fill={art.demo.path} />
              {[30, 110, 210, 290, 370].map((x, i) => (
                <Rect key={x} x={x} y={370 + (i % 2) * 10} width={18} height={6} rx={3} fill={art.demo.pebble} />
              ))}
            </>
          ) : null}
        </G>
      ))}
    </Group>
  );
}
export function World({ clock }: { clock: SharedValue<DemoState> }) {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMax slice"
      style={StyleSheet.absoluteFill}>
      {[0, 1, 2, 3].map((index) => (
        <Layer key={index} {...{ index, clock }} />
      ))}
    </Svg>
  );
}
export function Treadmill({ clock }: { clock: SharedValue<DemoState> }) {
  const props = useAnimatedProps(() => ({ matrix: [1, 0, 0, 1, -clock.value.distance % 30, 0] }));
  return (
    <Svg width={190} height={120} style={{ position: 'absolute', left: 0, bottom: 86 }} viewBox="0 0 190 120">
      <Rect x={6} y={88} width={178} height={22} rx={11} fill={art.demo.treadmill} />
      <Rect x={18} y={94} width={154} height={9} rx={4.5} fill={art.demo.belt} />
      <Group animatedProps={props}>
        {[26, 56, 86, 116, 146, 176].map((x) => (
          <Rect key={x} x={x} y={96} width={10} height={5} rx={2} fill={art.demo.beltTick} />
        ))}
      </Group>
      <Rect x={158} y={18} width={12} height={76} rx={6} fill={art.demo.belt} />
      <Rect x={140} y={6} width={46} height={26} rx={8} fill={art.demo.treadmill} />
      <Rect x={153} width={16} height={26} rx={4} fill={t.surface.card} transform="rotate(-8 161 13)" />
    </Svg>
  );
}
