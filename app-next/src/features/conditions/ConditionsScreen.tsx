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
  PressableScale,
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
import { SchedulePlanError } from '../../domain/scheduleRepresentability';
import { useRuntimeStatus } from '../../state/selectors';
export function ConditionsScreen({ onAdd, onEdit }: { onAdd: () => void; onEdit: (id: string) => void }) {
  const { rules, lockedApps, migrationNote } = useRulesStore((s) => s.data),
    runtime = useRuntime(),
    { scheduleIssue } = useRuntimeStatus(),
    [deleting, setDeleting] = useState<string | null>(null),
    [scheduleError, setScheduleError] = useState(false);
  const ordered = [...rules].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <ScreenShell dock
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
      <Heading title={c.title} />
      {scheduleIssue ? (
        <View
          style={{
            padding: t.space.lg,
            borderRadius: t.radius.card,
            backgroundColor: t.surface.card,
            borderWidth: t.stroke.hairline,
            borderColor: t.border.outline,
          }}>
          <Label style={{ color: t.text.secondary }}>{c.scheduleRecovery}</Label>
        </View>
      ) : null}
      {scheduleError ? (
        <View
          style={{
            padding: t.space.lg,
            borderRadius: t.radius.card,
            backgroundColor: t.surface.card,
            borderWidth: t.stroke.hairline,
            borderColor: t.border.outline,
          }}>
          <Label style={{ color: t.text.secondary }}>{c.scheduleLimit}</Label>
        </View>
      ) : null}
      {migrationNote ? (
        <View
          style={{
            padding: t.space.lg,
            borderRadius: t.radius.card,
            backgroundColor: t.surface.card,
            borderWidth: t.stroke.hairline,
            borderColor: t.border.default,
            gap: t.space.sm,
          }}>
          <Label>{migrationNote}</Label>
          <PressableScale
            label={c.dismissRetired}
            onPress={() => useRulesStore.getState().patch({ migrationNote: null })}
            style={{ alignSelf: 'flex-start', minHeight: t.layout.touch, justifyContent: 'center' }}>
            <Label variant="support" style={{ color: t.text.primary }}>
              {c.dismissRetired}
            </Label>
          </PressableScale>
        </View>
      ) : null}
      {ordered.length ? <PrimaryButton label={c.add} onPress={onAdd} /> : null}
      {ordered.length ? (
        <>
          {ordered.map((rule, index) => (
            <Reveal key={rule.id} index={index}>
              <RuleCard
                title={ruleName(rule)}
                schedule={scheduleLabel(rule.schedule)}
                icon={rule.activity}
                enabled={rule.enabled}
                onOpen={() => onEdit(rule.id)}
                onToggle={(value) => {
                  try {
                    toggleRule(rule.id, value, {
                      now: runtime.clock.now(),
                      timezone: runtime.clock.timezone(),
                    });
                    setScheduleError(false);
                  } catch (error) {
                    if (!(error instanceof SchedulePlanError)) throw error;
                    setScheduleError(true);
                  }
                }}
                onDelete={() => setDeleting(rule.id)}
              />
            </Reveal>
          ))}
        </>
      ) : (
        <EmptyState icon="walking" title={c.empty} body={c.emptyBody} action={c.add} onAction={onAdd} />
      )}
      <View style={{ backgroundColor: t.surface.card, borderRadius: t.radius.pill, borderWidth: t.stroke.hairline, borderColor: t.border.outline }}>
        <SettingsRow title="Lock list" icon="lock" iconTint={t.brand.primary} onPress={() => void runtime.screenTime.presentAppPicker()} />
      </View>
    </ScreenShell>
  );
}
