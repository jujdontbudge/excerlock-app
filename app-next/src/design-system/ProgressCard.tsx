import { View } from 'react-native';
import { tokens as t } from './tokens';
import { Label } from './Label';
import { Icon, IconName } from '../icons/Icon';
import { ProgressBar } from './ProgressBar';
import { SecondaryButton } from './SecondaryButton';
import { ValueReveal } from '../motion/ValueReveal';
import { Reveal } from '../motion/Reveal';
import { welcomeTokens as w } from './welcomeTokens';
export function ProgressCard({
  title,
  icon,
  value,
  detail,
  action,
  onAction,
  appearance = 'card',
}: {
  title: string;
  icon: IconName;
  value: number;
  detail: string;
  action?: string;
  onAction?: () => void;
  appearance?: 'card' | 'lock';
}) {
  const inLock = appearance === 'lock';
  return (
    <Reveal>
      <View
        style={{
          padding: inLock ? w.card.padding : t.space.lg,
          paddingVertical: inLock ? t.space.md : t.space.lg,
          borderRadius: inLock ? 0 : t.radius.card,
          borderWidth: inLock ? 0 : t.stroke.hairline,
          borderTopWidth: inLock ? 0 : t.stroke.hairline,
          borderColor: inLock ? 'rgba(255,255,255,0.4)' : t.border.outline,
          backgroundColor: inLock ? 'transparent' : t.surface.card,
          gap: t.space.lg,
        }}>
        {inLock ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.space.md }}>
            <Icon name={icon} tint={t.text.onAccent} variant="utility" size={t.space.xxl} />
            <View style={{ flexShrink: 1 }}>
              <ValueReveal value={detail}>
                <Label variant="label" tone="onAccent">
                  {detail}
                </Label>
              </ValueReveal>
            </View>
          </View>
        ) : (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.space.md,
            }}>
            <Icon name={icon} tint={inLock ? t.text.onAccent : undefined} variant={inLock ? 'utility' : 'color'} />
            <Label variant="label" tone={inLock ? 'onAccent' : 'primary'} style={{ flex: 1 }}>
              {title}
            </Label>
          </View>
        )}
        <ProgressBar value={value} label={title} inverse={inLock} />
        {!inLock ? (
          <ValueReveal value={detail}>
            <Label variant="support" tone={inLock ? 'onAccent' : 'secondary'}>
              {detail}
            </Label>
          </ValueReveal>
        ) : null}
        {action && onAction ? <SecondaryButton label={action} onPress={onAction} /> : null}
      </View>
    </Reveal>
  );
}
