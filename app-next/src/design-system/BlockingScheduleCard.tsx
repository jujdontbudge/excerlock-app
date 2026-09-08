import { View } from 'react-native';
import { Children, ReactNode, useState } from 'react';
import { Schedule } from '../domain/types';
import { LinearGradient } from 'expo-linear-gradient';
import { Label } from './Label';
import { Icon, IconName } from '../icons/Icon';
import { welcomeTokens as w } from './welcomeTokens';
import { tokens as t } from './tokens';
import { BlockingTimeline, TimelineInterval } from './BlockingTimeline';
import { LockShackle } from './LockShackle';
/**
 * Shared onboarding card and Home lock. Its slots are fixed: header glyph, status title,
 * status subtitle, the rule sentence, the day timeline, a caption, then children rows.
 */
export function BlockingScheduleCard({
  message,
  start,
  end,
  icon,
  lock = false,
  children,
  window,
  segments,
  nowMinute,
  glyph,
  statusTitle,
  statusSubtitle,
  caption,
  open = false,
}: {
  message: string;
  start: string;
  end: string;
  icon: IconName;
  lock?: boolean;
  children?: ReactNode;
  window?: Schedule['window'];
  segments?: TimelineInterval[];
  nowMinute?: number;
  /** Header glyph inside the lock; defaults to the open or closed padlock. */
  glyph?: IconName;
  statusTitle?: string;
  statusSubtitle?: string;
  /** One line under the timeline, e.g. which condition unlocked the day. */
  caption?: string;
  open?: boolean;
}) {
  const [bodyWidth, setBodyWidth] = useState(0);
  const bodyRadius = lock ? bodyWidth * 0.13 : w.card.radius;
  const rows = Children.count(children) > 0;
  const timeline = (
    <BlockingTimeline start={start} end={end} window={window} segments={segments} nowMinute={nowMinute} />
  );
  return (
    <View>
      {lock ? <LockShackle bodyWidth={bodyWidth} open={open} /> : null}
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
            // The silhouette keeps its height until stacked condition rows need more room.
            aspectRatio: lock && !rows ? 1 / 0.67 : undefined,
            minHeight: lock && rows ? bodyWidth * 0.67 : undefined,
            justifyContent: lock ? 'space-between' : undefined,
            paddingVertical: lock ? t.space.md : undefined,
          }}>
          <View
            style={{
              padding: w.card.padding,
              paddingVertical: lock ? t.space.md : w.card.padding,
              minHeight: lock ? undefined : w.card.minHeight,
              justifyContent: 'space-between',
              gap: lock && statusTitle ? t.space.sm : t.space.lg,
            }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: lock ? 'center' : undefined,
                gap: t.space.md,
              }}>
              <View style={{ paddingTop: t.space.xs }}>
                <Icon
                  name={lock ? (glyph ?? (open ? 'lock-open' : 'lock')) : icon}
                  variant="utility"
                  tint={t.text.onAccent}
                  size={t.space.xxl}
                />
              </View>
              <Label
                accessibilityRole="header"
                accessibilityLabel={(statusTitle ?? message).replace(/\n/g, ' ')}
                style={{
                  ...w.type.card,
                  color: t.text.onAccent,
                  flex: lock ? undefined : 1,
                  flexShrink: 1,
                  textAlign: lock ? 'center' : undefined,
                }}>
                {statusTitle ?? message}
              </Label>
            </View>
            {statusSubtitle ? (
              <Label variant="body" tone="onAccent" style={{ textAlign: 'center' }}>
                {statusSubtitle}
              </Label>
            ) : null}
            {statusTitle ? (
              <Label
                variant="support"
                tone="onAccent"
                accessibilityRole="header"
                accessibilityLabel={message.replace(/\n/g, ' ')}
                style={{ textAlign: 'center', opacity: 0.85 }}>
                {message}
              </Label>
            ) : null}
            {!lock ? timeline : null}
          </View>
          {lock ? <View style={{ paddingHorizontal: w.card.padding, paddingVertical: t.space.md }}>{timeline}</View> : null}
          {caption ? (
            <Label
              variant="support"
              tone="onAccent"
              style={{ paddingHorizontal: w.card.padding, paddingBottom: t.space.sm, textAlign: 'center' }}>
              {caption}
            </Label>
          ) : null}
          {children}
        </LinearGradient>
      </View>
    </View>
  );
}
