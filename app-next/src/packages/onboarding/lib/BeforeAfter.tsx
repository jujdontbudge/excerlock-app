import { useEffect, useState, type ReactNode } from 'react';
import { Image, View, type ImageSourcePropType, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { Answers } from '../../model/answers';
import { BackButton } from '../../ui/BackButton';
import { Icon } from '../../ui/Icon';
import { Label } from '../../ui/Label';
import { scheduleHaptic } from '../../ui/haptics';
import { opacityIn, popInAt, slideUp } from '../../ui/presets';
import { Reveal } from '../../ui/Reveal';
import { tokens as t } from '../../ui/tokens';
import { useMotion } from '../../ui/useMotion';
import { beforeAfterCopy as c, beforeAfterLines } from './beforeAfterCopy';

type Figure = { source: ImageSourcePropType; width: number; height: number; reach: number; align: 'end' | 'centre' };
const cast: Record<'boy' | 'girl', Record<'before' | 'gym' | 'walk', Figure>> = {
  boy: {
    before: { source: require('../../../../assets/onboarding/before-after/before.png'), width: 646, height: 574, reach: 1.2, align: 'end' },
    gym: { source: require('../../../../assets/onboarding/before-after/after-gym.png'), width: 407, height: 654, reach: 0.86, align: 'centre' },
    walk: { source: require('../../../../assets/onboarding/before-after/after-walk.png'), width: 385, height: 637, reach: 0.84, align: 'centre' },
  },
  girl: {
    before: { source: require('../../../../assets/onboarding/before-after/girl-before.png'), width: 646, height: 603, reach: 1.2, align: 'end' },
    gym: { source: require('../../../../assets/onboarding/before-after/girl-after-gym.png'), width: 407, height: 651, reach: 0.86, align: 'centre' },
    walk: { source: require('../../../../assets/onboarding/before-after/girl-after-walk.png'), width: 404, height: 671, reach: 0.84, align: 'centre' },
  },
};
type Motion = ReturnType<typeof useMotion>;

const beat = 140,
  timeline = { before: 120, beforeRows: 360, arrow: 980, after: 1120, afterRows: 1400 } as const,
  look = {
    overlap: t.space.lg,
    lift: t.space.xxl,
    cutout: t.space.xs + t.stroke.hairline,
    floor: t.space.md,
    shadow: 0.07,
    minHeight: 440,
    cloud: { width: 64, height: 40, fall: 22, drops: [26, 38, 50] },
    sun: 76,
    sparkle: 'M12 0C13 7 17 11 24 12C17 13 13 17 12 24C11 17 7 13 0 12C7 11 11 7 12 0Z',
    arrow: { width: 56, height: 48 },
  } as const;
const enterAt = (m: Motion, ms: number) => slideUp(m.reduced, ms / t.motion.stagger.list);

export function BeforeAfter({ answers, onBack }: { answers: Answers; onBack: () => void }) {
  const m = useMotion(),
    lines = beforeAfterLines(answers),
    figures = cast[answers.gender === 'female' ? 'girl' : 'boy'],
    title = `${c.title.before}${c.title.emphasis}${c.title.after}`;
  useEffect(() => {
    if (m.reduced) return;
    const cancels = [
      scheduleHaptic('beat', timeline.after),
      ...lines.after.map((_, index) => scheduleHaptic('detent', timeline.afterRows + index * beat)),
    ];
    return () => cancels.forEach((cancel) => cancel());
  }, [m.reduced, lines.after]);
  return (
    <View style={{ flex: 1, gap: t.space.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <BackButton onPress={onBack} />
        <Reveal style={{ flex: 1 }}>
          <Label accessibilityRole="header" accessibilityLabel={title} variant="display" style={{ textAlign: 'center' }}>
            {c.title.before}
            <Label variant="display" style={{ color: t.brand.primary }}>
              {c.title.emphasis}
            </Label>
            {c.title.after}
          </Label>
        </Reveal>
        <View style={{ width: t.icon.md }} />
      </View>
      <View style={{ flex: 1, minHeight: look.minHeight, flexDirection: 'row' }}>
        <Animated.View entering={enterAt(m, timeline.before)} style={{ flex: 1, marginTop: look.lift, marginRight: -look.overlap / 2 }}>
          <Side kind="before" lines={lines.before} figure={figures.before} rowsAt={timeline.beforeRows} />
        </Animated.View>
        <Pop at={timeline.after} fill style={{ flex: 1, marginBottom: look.lift, marginLeft: -look.overlap / 2, zIndex: 1 }}>
          <Side
            kind="after"
            lines={lines.after}
            figure={answers.activity === 'gym' ? figures.gym : figures.walk}
            rowsAt={timeline.afterRows}
          />
        </Pop>
        <Pop
          at={timeline.arrow}
          style={{ position: 'absolute', left: '50%', top: '58%', marginLeft: -look.arrow.width * 0.82, zIndex: 2 }}>
          <Arrow />
        </Pop>
      </View>
    </View>
  );
}

function Pop({ at, fill = false, style, children }: { at: number; fill?: boolean; style: ViewStyle; children: ReactNode }) {
  const m = useMotion();
  return (
    <Animated.View entering={opacityIn('standard', at)} pointerEvents={fill ? 'auto' : 'none'} style={style}>
      <Animated.View entering={popInAt(m.reduced, at)} style={fill ? { flex: 1 } : undefined}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

function Side({ kind, lines, figure, rowsAt }: { kind: 'before' | 'after'; lines: readonly string[]; figure: Figure; rowsAt: number }) {
  const m = useMotion(),
    after = kind === 'after',
    title = after ? c.after : c.before;
  return (
    <View accessible accessibilityLabel={`${title}: ${lines.join(', ')}`} style={{ flex: 1 }}>
      <View
        style={{
          flex: 1,
          overflow: 'hidden',
          borderRadius: t.radius.card + (after ? look.cutout : 0),
          paddingTop: t.space.lg,
          backgroundColor: after ? t.brand.track : t.surface.well,
          ...(after ? { borderWidth: look.cutout, borderColor: t.surface.warmCanvas } : null),
        }}>
        <View style={{ paddingHorizontal: t.space.md, gap: t.space.sm }}>
          <Label variant="display" accessible={false} style={{ textAlign: 'left', color: after ? t.brand.primary : t.text.primary }}>
            {title}
          </Label>
          {lines.map((line, index) => (
            <Animated.View
              key={line}
              entering={enterAt(m, rowsAt + index * beat)}
              style={{ flexDirection: 'row', gap: t.space.xs + t.stroke.selected }}>
              <View style={{ height: t.type.label.lineHeight, justifyContent: 'center' }}>
                <Icon name={after ? 'check' : 'close'} size={t.icon.sm} tone={after ? 'accent' : 'muted'} variant="utility" />
              </View>
              <Label
                variant="label"
                accessible={false}
                style={{ flex: 1, textAlign: 'left', color: after ? t.text.primary : t.text.secondary }}>
                {line}
              </Label>
            </Animated.View>
          ))}
        </View>
        <FigureBox figure={figure} glow={after} cover={after ? 0 : look.overlap} />
      </View>
      <View pointerEvents="none" style={after ? { position: 'absolute', top: -t.space.xl, right: -t.space.md } : { position: 'absolute', top: -t.space.lg, right: look.overlap + t.space.xs }}>
        {after ? <Sun /> : <Cloud />}
      </View>
    </View>
  );
}

function FigureBox({ figure, glow, cover }: { figure: Figure; glow: boolean; cover: number }) {
  const [box, setBox] = useState<{ width: number; height: number } | null>(null),
    visible = box ? box.width - cover : 0,
    scale = box ? Math.min((visible * figure.reach) / figure.width, (box.height - look.floor) / figure.height) : 0,
    width = figure.width * scale,
    height = figure.height * scale,
    left = figure.align === 'end' ? visible - width - t.space.sm : (visible - width) / 2;
  return (
    <View
      style={{ flex: 1 }}
      onLayout={(event) => {
        const { width: w, height: h } = event.nativeEvent.layout;
        setBox((current) => (current && current.width === w && current.height === h ? current : { width: w, height: h }));
      }}>
      {box && scale > 0 ? (
        <>
          <Svg
            width={width}
            height={look.floor * 2}
            style={{ position: 'absolute', bottom: 0, left }}>
            <Ellipse cx={width / 2} cy={look.floor} rx={width * 0.44} ry={look.floor * 0.55} fill={t.text.primary} fillOpacity={look.shadow} />
          </Svg>
          <Image
            accessible={false}
            source={figure.source}
            style={{ position: 'absolute', bottom: look.floor, left, width, height }}
          />
          {glow ? (
            <>
              <Sparkle size={t.icon.md} color={t.swatch.yellow} delay={0} style={{ left: left - t.space.sm, bottom: look.floor + height * 0.78 }} />
              <Sparkle size={t.icon.sm} color={t.brand.primary} delay={t.motion.duration.emphasized * 2} style={{ left: left + width - t.space.xs, bottom: look.floor + height * 0.9 }} />
              <Sparkle size={t.icon.sm} color={t.swatch.yellow} delay={t.motion.duration.emphasized * 3} style={{ left: left + width - t.space.lg, bottom: look.floor + height * 0.5 }} />
            </>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function Cloud() {
  const m = useMotion(),
    { width, height, fall, drops } = look.cloud;
  return (
    <View style={{ width, height: height + fall }}>
      {drops.map((left, index) => (
        <Animated.View
          key={left}
          style={[
            { position: 'absolute', left, top: height - t.space.sm },
            m.keyframes(
              {
                from: { opacity: 0, transform: [{ translateY: 0 }] },
                '30%': { opacity: 1 },
                to: { opacity: 0, transform: [{ translateY: fall }] },
              },
              'emphasized',
              { loop: true, spread: t.motion.duration.emphasized * 1.5, delay: index * beat * 3, curve: 'steady' },
            ) as ViewStyle,
          ]}>
          <Svg width={6} height={9} viewBox="0 0 6 9">
            <Path d="M3 0C3 0 6 4.5 6 6A3 3 0 0 1 0 6C0 4.5 3 0 3 0Z" fill={t.swatch.sky} />
          </Svg>
        </Animated.View>
      ))}
      <Svg width={width} height={height} viewBox="0 0 64 40">
        <G fill={t.chart.comparison}>
          <Circle cx={18} cy={26} r={11} />
          <Circle cx={33} cy={18} r={15} />
          <Circle cx={48} cy={26} r={11} />
          <Rect x={18} y={22} width={30} height={15} />
        </G>
      </Svg>
    </View>
  );
}

function Sun() {
  const m = useMotion(),
    size = look.sun,
    centre = size / 2,
    rays = Array.from({ length: 8 }, (_, index) => (index * Math.PI) / 4);
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={[
          { position: 'absolute', width: size, height: size },
          m.keyframes(
            {
              from: { opacity: 0.6, transform: [{ scale: 0.86 }] },
              '50%': { opacity: 1, transform: [{ scale: 1.04 }] },
              to: { opacity: 0.6, transform: [{ scale: 0.86 }] },
            },
            'breathe',
            { loop: true },
          ) as ViewStyle,
        ]}>
        <Svg width={size} height={size}>
          <Circle cx={centre} cy={centre} r={centre} fill={t.brand.light} fillOpacity={0.7} />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          { position: 'absolute', width: size, height: size },
          m.keyframes(
            { from: { transform: [{ rotate: '0deg' }] }, to: { transform: [{ rotate: '360deg' }] } },
            'breathe',
            { loop: true, spread: t.motion.duration.breathe * 4, curve: 'steady' },
          ) as ViewStyle,
        ]}>
        <Svg width={size} height={size}>
          {rays.map((angle) => (
            <Line
              key={angle}
              x1={centre + Math.cos(angle) * size * 0.3}
              y1={centre + Math.sin(angle) * size * 0.3}
              x2={centre + Math.cos(angle) * size * 0.4}
              y2={centre + Math.sin(angle) * size * 0.4}
              stroke={t.swatch.yellow}
              strokeWidth={t.stroke.glyph + 1}
              strokeLinecap="round"
            />
          ))}
        </Svg>
      </Animated.View>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={centre} cy={centre} r={size * 0.22} fill={t.swatch.yellow} />
      </Svg>
    </View>
  );
}

function Sparkle({ size, color, delay, style }: { size: number; color: string; delay: number; style: ViewStyle }) {
  const m = useMotion();
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', width: size, height: size },
        style,
        m.keyframes(
          {
            from: { opacity: 0.3, transform: [{ scale: 0.5 }] },
            '50%': { opacity: 1, transform: [{ scale: 1 }] },
            to: { opacity: 0.3, transform: [{ scale: 0.5 }] },
          },
          'emphasized',
          { loop: true, spread: t.motion.duration.emphasized * 3, delay: timeline.after + delay },
        ) as ViewStyle,
      ]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={look.sparkle} fill={color} />
      </Svg>
    </Animated.View>
  );
}

function Arrow() {
  const { width, height } = look.arrow;
  return (
    <Svg width={width} height={height} viewBox="0 0 56 48">
      <Path
        d="M5 42C7 25 20 13 42 12M34 4L43 12L35 20"
        fill="none"
        stroke={t.text.primary}
        strokeWidth={t.stroke.glyph}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
