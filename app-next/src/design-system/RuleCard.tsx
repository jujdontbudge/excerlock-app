import { useRef, useState } from 'react';
import { View } from 'react-native';
import { tokens as t } from './tokens';
import { Label } from './Label';
import { Icon, IconName } from '../icons/Icon';
import { Pictogram } from './Pictogram';
import { PressableScale } from './PressableScale';
import { BottomSheet } from './BottomSheet';
import { controls } from '../content/controls';

export function RuleCard({
  title,
  schedule,
  icon,
  enabled,
  onOpen,
  onToggle,
  onDelete,
}: {
  title: string;
  schedule: string;
  icon: IconName;
  enabled: boolean;
  onOpen: () => void;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);
  const runPendingAction = () => {
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  };
  const closeThen = (action: () => void) => {
    pendingAction.current = action;
    setMenuOpen(false);
    // The native Modal's onDismiss is authoritative on iOS. This guarded
    // fallback covers environments that do not emit it (including tests).
    setTimeout(runPendingAction, t.motion.duration.sheet + t.motion.duration.fast);
  };
  return (
    <>
      <View style={{
        backgroundColor: t.surface.card,
        borderColor: t.border.divider,
        borderWidth: t.stroke.hairline,
        borderRadius: t.radius.sheet,
        padding: t.space.lg,
        gap: t.space.sm,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={enabled ? 'Active condition' : 'Inactive condition'}
            style={{
              width: t.control.inline,
              height: t.control.inline,
              borderRadius: t.radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: enabled ? t.brand.primary : t.surface.well,
            }}>
            <Icon name="clock" variant="utility" size={t.icon.md}
              tint={enabled ? t.text.onAccent : t.border.mutedStroke} />
          </View>
          <PressableScale
            label={`More actions for ${title}`}
            onPress={() => setMenuOpen(true)}
            hitSlop={8}
            style={{ width: t.control.inline, alignItems: 'center' }}>
            <Icon name="more" variant="utility" size={t.icon.md} tint={t.text.secondary} />
          </PressableScale>
        </View>
        <PressableScale
          label={title}
          onPress={onOpen}
          accessibilityHint="Edit condition"
          style={{ alignItems: 'center', paddingHorizontal: t.space.lg, paddingBottom: t.space.lg, gap: t.space.sm }}>
          <Pictogram name={icon} size="card" variant="utility" tint={enabled ? t.brand.primary : t.border.mutedStroke} />
          <Label variant="section" style={{ textAlign: 'center' }}>{title}</Label>
          <Label variant="body" tone="secondary" style={{ textAlign: 'center' }}>{schedule}</Label>
        </PressableScale>
      </View>
      <BottomSheet open={menuOpen} title={title} onDismiss={() => setMenuOpen(false)} onClosed={runPendingAction}>
        <ActionRow icon="gear" label="Edit condition" onPress={() => closeThen(onOpen)} />
        <ActionRow
          icon={enabled ? 'lock-open' : 'lock'}
          label={enabled ? 'Turn off' : 'Turn on'}
          onPress={() => closeThen(() => onToggle(!enabled))}
        />
        <ActionRow icon="trash" label={controls.remove} destructive onPress={() => closeThen(onDelete)} />
      </BottomSheet>
    </>
  );
}

function ActionRow({
  icon,
  label,
  destructive = false,
  onPress,
}: {
  icon: IconName;
  label: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  const tint = destructive ? t.state.error : t.text.primary;
  return (
    <PressableScale label={label} onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.lg,
        minHeight: t.control.row, borderBottomWidth: t.stroke.hairline, borderBottomColor: t.border.divider }}>
      <Icon name={icon} variant="utility" size={t.icon.md} tint={tint} />
      <Label variant="label" style={{ color: tint }}>{label}</Label>
    </PressableScale>
  );
}
