import { View } from 'react-native';
import { ReactNode, useState } from 'react';
import { Schedule } from '../domain/types';
import { LinearGradient } from 'expo-linear-gradient';
import { Label } from './Label';
import { Icon, IconName } from '../icons/Icon';
import { tokens as t } from './tokens';
import { BlockingTimeline } from './BlockingTimeline';
import { LockShackle } from './LockShackle';
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
  const bodyRadius = lock ? bodyWidth * 0.13 : t.radius.card;
  return (
    <View>
      {lock ? <LockShackle bodyWidth={bodyWidth} /> : null}
      <View
        onLayout={lock ? (event) => setBodyWidth(event.nativeEvent.layout.width) : undefined}
        style={{ borderRadius: bodyRadius, boxShadow: t.shadow.status }}>
        <LinearGradient
          testID={lock ? 'lock-body' : undefined}
          colors={t.surface.statusGradient}
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
              padding: t.space.lg,
              paddingVertical: lock ? t.space.md : t.space.lg,
              minHeight: lock ? undefined : t.layout.statusCard,
              justifyContent: 'space-between',
              gap: t.space.lg,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: lock ? 'center' : undefined, gap: t.space.md }}>
              <View style={{ paddingTop: t.space.xs }}>
                <Icon name={lock ? 'lock' : icon} variant="utility" tone="onAccent" size={t.icon.lg} />
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
            <View style={{ paddingHorizontal: t.space.lg, paddingVertical: t.space.md }}>
              <BlockingTimeline start={start} end={end} window={window} />
            </View>
          ) : null}
          {action ?? children}
        </LinearGradient>
      </View>
    </View>
  );
}
