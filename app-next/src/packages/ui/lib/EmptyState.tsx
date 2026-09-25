import { View } from 'react-native';
import { LivingIcon } from '../LivingIcon';
import { IconName } from '../Icon';
import { Heading } from './Heading';
import { PrimaryButton } from '../PrimaryButton';
import { tokens as t } from '../tokens';
export function EmptyState({
  icon,
  title,
  body,
  action,
  onAction,
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ paddingVertical: t.space.xxl, gap: t.space.xl }}>
      <LivingIcon name={icon} />
      <Heading title={title} support={body} centered />
      {action && onAction ? <PrimaryButton label={action} onPress={onAction} /> : null}
    </View>
  );
}
