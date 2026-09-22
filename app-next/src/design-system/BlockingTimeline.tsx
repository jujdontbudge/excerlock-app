import { View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { Label } from './Label';
import { tokens as t } from './tokens';
import { useMotion } from '../motion/useMotion';
import { Schedule } from '../domain/types';
import { timelineSegments } from './timelineSegments';
export function BlockingTimeline({ start, end, window }: { start: string; end: string; window?: Schedule['window'] }) {
  const m = useMotion();
  const { fontScale } = useWindowDimensions();
  return (
    <View style={{ gap: t.space.sm }}>
      <Animated.View
        style={{
          height: window ? t.space.xs * 1.5 : t.space.xs,
          marginHorizontal: t.space.xs,
          backgroundColor: window ? t.surface.onAccentTrack : t.text.onAccent,
          borderRadius: t.radius.pill,
          animationName: m.reduced
            ? undefined
            : { from: { transform: [{ scaleX: 0 }] }, to: { transform: [{ scaleX: 1 }] } },
          animationDuration: m.duration.reveal,
          animationDelay: m.duration.standard,
          animationFillMode: 'both',
          transformOrigin: 'left center',
        }}>
        {window
          ? timelineSegments(window).map((segment, i) => (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: `${segment.left}%`,
                  width: `${segment.width}%`,
                  height: '100%',
                  backgroundColor: t.text.onAccent,
                  borderRadius: t.radius.pill,
                }}>
                {[{ left: -t.space.xs }, { right: -t.space.xs }].map((side, j) => (
                  <View
                    key={j}
                    style={{
                      position: 'absolute',
                      top: -t.space.xs / 2,
                      ...side,
                      width: t.space.sm,
                      height: t.space.sm,
                      borderRadius: t.radius.pill,
                      backgroundColor: t.text.onAccent,
                    }}
                  />
                ))}
              </View>
            ))
          : [{ left: -t.space.xs }, { right: -t.space.xs }].map((side, i) => (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  top: -t.space.xs / 2,
                  ...side,
                  width: t.space.sm,
                  height: t.space.sm,
                  borderRadius: t.radius.pill,
                  backgroundColor: t.text.onAccent,
                }}
              />
            ))}
      </Animated.View>
      {window?.kind === 'range' ? (
        <View style={{ marginHorizontal: t.space.xs }}>
          {/* Reserves one line of support text for the absolutely placed times below. */}
          <View style={{ height: t.type.support.lineHeight * Math.min(fontScale, t.a11y.textScale) }} />
          {[
            { text: start, minute: window.startMinute },
            { text: end, minute: window.endMinute },
          ].map(({ text, minute }, i) => (
            <Label
              key={i}
              variant="support"
              tone="onAccent"
              style={{
                position: 'absolute',
                top: 0,
                left: `${(minute / 1440) * 100}%`,
                transform: [{ translateX: minute < 120 ? '0%' : minute > 1320 ? '-100%' : '-50%' }],
              }}>
              {text}
            </Label>
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Label variant="support" tone="onAccent">
            {start}
          </Label>
          <Label variant="support" tone="onAccent">
            {end}
          </Label>
        </View>
      )}
    </View>
  );
}
