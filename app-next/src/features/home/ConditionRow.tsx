import { Pressable, View } from 'react-native';
import { Label, ProgressCard } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { welcomeTokens as w } from '../../design-system/welcomeTokens';
import { ConditionStatus } from '../../domain/conditionState';
import { UnlockEntryKind } from '../unlock/entry';
import { UnlockEntry } from '../unlock/UnlockEntry';
import { ProgressModel } from './progressContent';
import { homeCopy as c } from '../../content/home';
const entryLabels: Record<UnlockEntryKind, string> = {
  gym: c.gymEntry,
  treadmill: c.treadmillEntry,
  handheld: c.handheldEntry,
};
/**
 * One condition inside the Home lock: icon, name and number on a row, its bar under it,
 * the state it is in today, and the pills that can unlock it.
 */
export function ConditionRow({
  model,
  status,
  entries = [],
  onEntry,
  onAction,
}: {
  model: ProgressModel;
  status: ConditionStatus;
  entries?: UnlockEntryKind[];
  onEntry?: (kind: UnlockEntryKind) => void;
  onAction?: () => void;
}) {
  const muted = status.tone === 'muted';
  const chip = (
    <Label variant="support" tone="onAccent" style={{ opacity: status.tone === 'active' ? 0.8 : 1 }}>
      {status.text}
    </Label>
  );
  return (
    <View
      style={{
        opacity: muted ? 0.6 : 1,
        borderTopWidth: t.stroke.hairline,
        borderTopColor: 'rgba(255,255,255,0.4)',
      }}>
      <ProgressCard
        appearance="lock"
        title={model.title}
        icon={model.icon}
        value={model.value}
        detail={model.detail}
        action={model.label}
        onAction={onAction}
      />
      <View style={{ paddingHorizontal: w.card.padding, paddingBottom: t.space.md, gap: t.space.sm }}>
        {onAction && !model.label ? (
          <Pressable accessibilityRole="button" accessibilityLabel={status.text} onPress={onAction}>
            {chip}
          </Pressable>
        ) : (
          chip
        )}
        {entries.map((kind) => (
          <UnlockEntry key={kind} kind={kind} label={entryLabels[kind]} onPress={() => onEntry?.(kind)} />
        ))}
      </View>
    </View>
  );
}
