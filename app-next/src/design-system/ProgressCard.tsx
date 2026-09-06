import { View } from 'react-native';
import { tokens as t } from './tokens';
import { Label } from './Label';
import { Icon, IconName } from '../icons/Icon';
import { ProgressBar } from './ProgressBar';
import { SecondaryButton } from './SecondaryButton';
import { ValueReveal } from '../motion/ValueReveal';
import { Reveal } from '../motion/Reveal';
export function ProgressCard({
  title,
  icon,
  value,
  detail,
  action,
  onAction,
}: {
  title: string;
  icon: IconName;
  value: number;
  detail: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <Reveal>
      <View
        style={{
          padding: t.space.lg,
          borderRadius: t.radius.card,
          borderWidth: t.stroke.hairline,
          borderColor: t.border.default,
          backgroundColor: t.surface.card,
          gap: t.space.lg,
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.space.md,
          }}>
          <Icon name={icon} />
          <Label variant="label" style={{ flex: 1 }}>
            {title}
          </Label>
        </View>
        <ProgressBar value={value} label={title} />
        <ValueReveal value={detail}>
          <Label variant="support" tone="secondary">
            {detail}
          </Label>
        </ValueReveal>
        {action && onAction ? <SecondaryButton label={action} onPress={onAction} /> : null}
      </View>
    </Reveal>
  );
}
