import { View } from 'react-native';
import { ReactNode, useState } from 'react';
import { Schedule } from '../domain/types';
import { LinearGradient } from 'expo-linear-gradient';
import { Label } from './Label';
import { Icon, IconName } from '../icons/Icon';
import { welcomeTokens as w } from './welcomeTokens';
import { tokens as t } from './tokens';
import { BlockingTimeline } from './BlockingTimeline';
import { LockShackle } from './LockShackle';
/** Shared onboarding card with caller-provided demo or live rule content. */
export function BlockingScheduleCard({
  message,
  start,
  end,
  icon,
  lock = false,
  children,
  window,
  action,
}: {
  message: string;
  start: string;
  end: string;
  icon: IconName;
  lock?: boolean;
  children?: ReactNode;
  window?: Schedule['window'];
  action?: ReactNode;
}) {
  const [bodyWidth, setBodyWidth] = useState(0);
  const bodyRadius = lock ? bodyWidth * 0.13 : w.card.radius;
  return (
    <View>
      {lock ? <LockShackle bodyWidth={bodyWidth} /> : null}
      <View
        onLayout={lock ? (event) => setBodyWidth(event.nativeEvent.layout.width) : undefined}
        style={{ borderRadius: bodyRadius, boxShadow: w.card.shadow }}>
        <LinearGradient
          testID={lock ? 'lock-body' : undefined}
          colors={[w.card.start, w.card.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: bodyRadius,
            overflow: 'hidden',
            aspectRatio: lock ? 1 / 0.67 : undefined,
            justifyContent: lock ? 'space-between' : undefined,
            paddingVertical: lock ? t.space.md : undefined,
          }}>
          <View
            style={{
              padding: w.card.padding,
              paddingVertical: lock ? t.space.md : w.card.padding,
              minHeight: lock ? undefined : w.card.minHeight,
              justifyContent: 'space-between',
              gap: t.space.lg,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: lock ? 'center' : undefined, gap: t.space.md }}>
              <View style={{ paddingTop: t.space.xs }}>
                <Icon name={lock ? 'lock' : icon} variant="utility" tint={t.text.onAccent} size={t.space.xxl} />
              </View>
              <Label
                accessibilityRole="header"
                accessibilityLabel={message.replace(/\n/g, ' ')}
                style={{ ...t.type.label, color: t.text.onAccent, flex: lock ? undefined : 1, flexShrink: 1 }}>
                {message}
              </Label>
            </View>
            {!lock ? <BlockingTimeline start={start} end={end} window={window} /> : null}
          </View>
          {lock ? (
            <View style={{ paddingHorizontal: w.card.padding, paddingVertical: t.space.md }}>
              <BlockingTimeline start={start} end={end} window={window} />
            </View>
          ) : null}
          {action ?? children}
        </LinearGradient>
      </View>
    </View>
  );
}
