import { ReactNode } from 'react';
import { View } from 'react-native';
import { Label } from '../../design-system/Label';
import { ProgressBar } from '../../design-system/ProgressBar';
import { tokens as t } from '../../design-system/tokens';
import { Icon, IconName } from '../../icons/Icon';

/** One Home condition card; Home and the trial phone preview render the same card. */
export function HomeConditionCard({
  testID,
  icon,
  title,
  schedule,
  detail,
  progress,
  children,
}: {
  testID?: string;
  icon: IconName;
  title: string;
  schedule: string;
  detail: string;
  progress: { value: number; tone: 'success' | 'brand' } | null;
  children?: ReactNode;
}) {
  return (
    <View testID={testID} style={{
      backgroundColor: t.surface.card, borderRadius: t.radius.card,
      borderWidth: t.stroke.hairline, borderColor: t.border.outline,
      padding: t.space.lg, gap: t.space.md,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
        <Icon name={icon} variant="utility" size={t.icon.lg} />
        <View style={{ flex: 1, gap: t.space.xs }}>
          <Label variant="label">{title}</Label>
          <Label variant="support" tone="secondary">{schedule}</Label>
        </View>
      </View>
      <Label variant="label">{detail}</Label>
      {progress ? <ProgressBar value={Math.max(0, Math.min(1, progress.value))} label={title} tone={progress.tone} /> : null}
      {children}
    </View>
  );
}
