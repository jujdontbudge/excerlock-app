import { View } from 'react-native';
import { Label } from './Label';
import { tokens as t } from './tokens';
import { Icon } from '../icons/Icon';
import { LivingIcon } from '../motion/LivingIcon';
import { Reveal } from '../motion/Reveal';
import { widgetCopy } from '../content/widget';
export function ScheduleWidget({
  start,
  end,
  status,
  unlocked = false,
}: {
  start: string;
  end: string;
  status: string;
  unlocked?: boolean;
}) {
  return (
    <Reveal>
      <View
        style={{
          borderRadius: t.radius.card,
          padding: t.space.xl,
          gap: t.space.xl,
          backgroundColor: t.surface.card,
          borderWidth: t.stroke.hairline,
          borderColor: t.border.outline,
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: t.space.sm,
          }}>
          {[start, end].map((time, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.space.sm,
              }}>
              <View
                style={{
                  borderRadius: t.radius.pill,
                  paddingHorizontal: t.space.md,
                  paddingVertical: t.space.sm,
                  backgroundColor: t.surface.subtle,
                }}>
                <Label variant="label">{time}</Label>
              </View>
              {!i ? <Icon name="arrow" size={t.layout.glyph} variant="utility" tint={t.brand.primary} /> : null}
            </View>
          ))}
        </View>
        <LivingIcon name={unlocked ? 'lock-open' : 'lock'} size={t.space.hero} />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: t.space.sm,
          }}>
          {widgetCopy.initials.map((initial, i) => (
            <Reveal key={initial} index={i}>
              <View
                accessible
                accessibilityLabel={widgetCopy.apps[i]}
                style={{
                  width: t.layout.disc,
                  height: t.layout.disc,
                  borderRadius: t.radius.field,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: [t.icon.lilac, t.icon.coral, t.icon.sky][i],
                }}>
                <Label variant="label">{initial}</Label>
              </View>
            </Reveal>
          ))}
        </View>
        <Reveal key={status}>
          <Label variant="support" style={{ textAlign: 'center' }}>
            {status}
          </Label>
        </Reveal>
      </View>
    </Reveal>
  );
}
