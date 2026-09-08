import { useState } from 'react';
import { View } from 'react-native';
import { tokens as t } from '../../design-system/tokens';
import {
  ScreenShell,
  Heading,
  SettingsRow,
  SettingsGroup,
  RuleCard,
  PrimaryButton,
  EmptyState,
  Label,
} from '../../design-system';
import { conditionsCopy as c } from '../../content/conditions';
import { pickerCopy } from '../../content/pickers';
import { rulesStore as useRulesStore } from '../../state/rulesStore';
import { ruleName } from '../../domain/ruleName';
import { scheduleLabel } from '../../domain/scheduleLabel';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { ConfirmSheet } from './ConfirmSheet';
import { toggleRule, deleteRule } from './mutations';
import { conditionStatus } from './conditionStatus';
import { ruleDaysStore as useRuleDaysStore } from '../../state/ruleDaysStore';
export function ConditionsScreen({ onAdd, onEdit }: { onAdd: () => void; onEdit: (id: string) => void }) {
  const { rules, lockedApps } = useRulesStore((s) => s.data),
    days = useRuleDaysStore((s) => s.data.days),
    runtime = useRuntime(),
    now = runtime.clock.now(),
    timezone = runtime.clock.timezone(),
    [deleting, setDeleting] = useState<string | null>(null);
  const ordered = [...rules].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <ScreenShell
      safeBottom={false}
      overlay={
        <ConfirmSheet
          open={deleting !== null}
          title={c.deleteTitle}
          body={c.deleteBody}
          confirm={c.delete}
          cancel={c.keepRule}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            if (deleting) deleteRule(deleting, now, timezone);
            setDeleting(null);
          }}
        />
      }>
      <Heading title={c.title} />
      {ordered.length ? (
        <>
          {ordered.map((rule, index) => (
            <Reveal key={rule.id} index={index}>
              <RuleCard
                title={ruleName(rule)}
                schedule={scheduleLabel(rule.schedule)}
                icon={rule.activity}
                enabled={rule.enabled}
                status={conditionStatus(rule, days, now, timezone)}
                onOpen={() => onEdit(rule.id)}
                onToggle={(value) => toggleRule(rule.id, value)}
                onDelete={() => setDeleting(rule.id)}
              />
            </Reveal>
          ))}
        </>
      ) : (
        <EmptyState icon="walking" title={c.empty} body={c.emptyBody} action={c.add} onAction={onAdd} />
      )}
      {ordered.length ? <PrimaryButton label={c.add} onPress={onAdd} /> : null}
      <View style={{ backgroundColor: t.surface.card, borderRadius: t.radius.pill, boxShadow: '0px 6px 20px rgba(100,55,25,0.10)' }}>
        <SettingsRow title="Lock list" icon="lock" iconTint={t.brand.primary} onPress={() => void runtime.screenTime.presentAppPicker()} />
      </View>
    </ScreenShell>
  );
}
