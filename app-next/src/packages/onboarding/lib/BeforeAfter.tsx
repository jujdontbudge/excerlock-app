import { useEffect, useState, type ReactNode } from 'react';
import { Image, View, type ImageSourcePropType, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Ellipse, Path } from 'react-native-svg';
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
          backgroundColor: after ? t.beforeAfter.afterTint : t.beforeAfter.beforeTint,
          ...(after ? { borderWidth: look.cutout, borderColor: t.surface.warmCanvas } : null),
        }}>
        <View style={{ paddingHorizontal: t.space.md, gap: t.space.sm }}>
          <Label variant="display" accessible={false} style={{ textAlign: 'left', color: after ? t.beforeAfter.after : t.beforeAfter.before }}>
            {title}
          </Label>
          {lines.map((line, index) => (
            <Animated.View
              key={line}
              entering={enterAt(m, rowsAt + index * beat)}
              style={{ flexDirection: 'row', gap: t.space.xs + t.stroke.selected }}>
              <View style={{ height: t.type.label.lineHeight, justifyContent: 'center' }}>
                <Icon name={after ? 'check' : 'close'} size={t.icon.sm} tone={after ? 'success' : 'danger'} variant="utility" />
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
      <View pointerEvents="none" style={{ position: 'absolute', top: t.space.lg, right: after ? t.space.md : look.overlap + t.space.md }}>
        <Icon name={after ? 'check' : 'close'} size={t.icon.lg} tone={after ? 'success' : 'danger'} variant="utility" />
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
              <Sparkle size={t.icon.sm} color={t.beforeAfter.after} delay={t.motion.duration.emphasized * 2} style={{ left: left + width - t.space.xs, bottom: look.floor + height * 0.9 }} />
              <Sparkle size={t.icon.sm} color={t.swatch.yellow} delay={t.motion.duration.emphasized * 3} style={{ left: left + width - t.space.lg, bottom: look.floor + height * 0.5 }} />
            </>
          ) : null}
        </>
      ) : null}
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
