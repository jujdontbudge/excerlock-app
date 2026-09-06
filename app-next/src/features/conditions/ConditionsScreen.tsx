import { useState } from 'react';
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
export function ConditionsScreen({ onAdd, onEdit }: { onAdd: () => void; onEdit: (id: string) => void }) {
  const { rules, lockedApps } = useRulesStore((s) => s.data),
    runtime = useRuntime(),
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
            if (deleting) deleteRule(deleting);
            setDeleting(null);
          }}
        />
      }>
      <Heading title={c.title} support={c.body} />
      <LivingIcon name="shield" />
      <Reveal>
        <SettingsGroup>
          <SettingsRow
            title={c.lockedApps}
            value={pickerCopy.counts(lockedApps.appCount, lockedApps.categoryCount)}
            icon="lock"
            onPress={() => void runtime.screenTime.presentAppPicker()}
          />
        </SettingsGroup>
      </Reveal>
      {ordered.length ? (
        <>
          <Label variant="section" accessibilityRole="header">
            {c.list}
          </Label>
          {ordered.map((rule, index) => (
            <Reveal key={rule.id} index={index}>
              <RuleCard
                title={ruleName(rule)}
                schedule={scheduleLabel(rule.schedule)}
                icon={rule.activity}
                enabled={rule.enabled}
                onOpen={() => onEdit(rule.id)}
                onToggle={(value) => toggleRule(rule.id, value)}
                onDelete={() => setDeleting(rule.id)}
              />
            </Reveal>
          ))}
          <PrimaryButton label={c.add} onPress={onAdd} />
        </>
      ) : (
        <EmptyState icon="walking" title={c.empty} body={c.emptyBody} action={c.add} onAction={onAdd} />
      )}
    </ScreenShell>
  );
}
