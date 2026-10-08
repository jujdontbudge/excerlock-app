import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { tokens as t } from '../tokens';
import { Label } from '../Label';
import { LivingIcon } from '../LivingIcon';
import { ValueReveal } from './ValueReveal';
import { Reveal } from '../Reveal';
export function StatusCard({
  title,
  subtitle,
  nextChange,
  unlocked = false,
  hero,
  appearance = 'neutral',
}: {
  title: string;
  subtitle: string;
  nextChange?: string;
  unlocked?: boolean;
  hero?: ReactNode;
  appearance?: 'neutral' | 'orange';
}) {
  const orange = appearance === 'orange';
  return (
    <Reveal>
      <View
        style={{
          padding: t.space.xl,
          borderRadius: orange ? t.radius.card : t.radius.card,
          borderWidth: orange ? 0 : t.stroke.hairline,
          borderColor: t.surface.transparent,
          backgroundColor: orange ? t.surface.statusGradient[0] : t.surface.softChoice,
          minHeight: orange ? t.layout.statusCard : undefined,
          justifyContent: 'center',
          boxShadow: orange ? t.shadow.status : undefined,
          gap: t.space.lg,
        }}>
        {orange ? (
          <LinearGradient
            colors={t.surface.statusGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: t.radius.card }}
          />
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            gap: t.space.lg,
            alignItems: 'center',
          }}>
          {hero ?? (
            <LivingIcon name={unlocked ? 'lock-open' : 'lock'} size="card" tone={orange ? 'onAccent' : undefined} />
          )}
          <View style={{ flex: 1, gap: t.space.sm }}>
            <ValueReveal value={title}>
              <Label accessibilityRole="header" variant="section" tone={orange ? 'onAccent' : 'primary'}>
                {title}
              </Label>
            </ValueReveal>
            <ValueReveal value={subtitle}>
              <Label tone={orange ? 'onAccent' : 'secondary'} variant="support">
                {subtitle}
              </Label>
            </ValueReveal>
          </View>
        </View>
        {nextChange ? (
          <ValueReveal value={nextChange}>
            <Label
              variant="support"
              style={{ color: orange ? t.text.onAccent : unlocked ? t.state.success : t.text.secondary }}>
              {nextChange}
            </Label>
          </ValueReveal>
        ) : null}
      </View>
    </Reveal>
  );
}
