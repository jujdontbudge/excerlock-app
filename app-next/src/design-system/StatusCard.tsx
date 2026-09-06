import { View } from 'react-native';
import { ReactNode } from 'react';
import { tokens as t } from './tokens';
import { Label } from './Label';
import { LivingIcon } from '../motion/LivingIcon';
import { ValueReveal } from '../motion/ValueReveal';
import { Reveal } from '../motion/Reveal';
export function StatusCard({
  title,
  subtitle,
  nextChange,
  unlocked = false,
  hero,
}: {
  title: string;
  subtitle: string;
  nextChange?: string;
  unlocked?: boolean;
  hero?: ReactNode;
}) {
  return (
    <Reveal>
      <View
        style={{
          padding: t.space.xl,
          borderRadius: t.radius.card,
          borderWidth: t.stroke.hairline,
          borderColor: t.border.default,
          backgroundColor: t.surface.card,
          gap: t.space.lg,
        }}>
        <View
          style={{
            flexDirection: 'row',
            gap: t.space.lg,
            alignItems: 'center',
          }}>
          {hero ?? <LivingIcon name={unlocked ? 'lock-open' : 'lock'} size={t.space.hero} />}
          <View style={{ flex: 1, gap: t.space.sm }}>
            <ValueReveal value={title}>
              <Label accessibilityRole="header" variant="section">
                {title}
              </Label>
            </ValueReveal>
            <ValueReveal value={subtitle}>
              <Label tone="secondary" variant="support">
                {subtitle}
              </Label>
            </ValueReveal>
          </View>
        </View>
        {nextChange ? (
          <ValueReveal value={nextChange}>
            <Label variant="support" style={{ color: unlocked ? t.state.success : t.text.secondary }}>
              {nextChange}
            </Label>
          </ValueReveal>
        ) : null}
      </View>
    </Reveal>
  );
}
