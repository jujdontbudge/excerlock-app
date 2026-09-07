import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Label } from '../../../design-system';
import { Icon } from '../../../icons/Icon';
import { Reveal } from '../../../motion/Reveal';
import { welcomeTokens as w } from '../../../design-system/welcomeTokens';
import { tokens as t } from '../../../design-system/tokens';
import { welcomeCopy as c } from '../../../content/welcome';
import { BlockingTimeline } from './BlockingTimeline';
export function ScheduleCard() {
  return (
    <Reveal
      index={3}
      style={{
        position: 'absolute',
        left: w.card.x,
        top: w.card.y,
        width: w.card.width,
        borderRadius: w.card.radius,
        boxShadow: w.card.shadow,
      }}>
      <LinearGradient
        colors={[w.card.start, w.card.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: w.card.radius,
          padding: w.card.padding,
          minHeight: w.card.minHeight,
          justifyContent: 'space-between',
          gap: t.space.lg,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.space.md }}>
          <View style={{ paddingTop: t.space.xs }}>
            <Icon name="gym" variant="utility" tint={t.text.onAccent} size={t.space.xxl} />
          </View>
          <Label accessibilityLabel={c.scheduleLabel} style={{ ...w.type.card, color: t.text.onAccent, flex: 1 }}>
            {c.schedule}
          </Label>
        </View>
        <BlockingTimeline />
      </LinearGradient>
    </Reveal>
  );
}
