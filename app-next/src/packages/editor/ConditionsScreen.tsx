import { bankConditionCopy, bankTrade } from '../conditions/bankCopy';
import { BankConditionConflict } from '../conditions/BankExclusivity';
import { ScreenTimePickerHost } from '../app-selection/ScreenTimePickerHost';
import { useEffect, useRef, useState } from 'react';
import { notify } from '../ui/Notice';
import { View } from 'react-native';
import { tokens as t } from '../ui/tokens';
import {
  ScreenShell,
  Heading,
  SettingsRow,
  RuleCard,
  PressableScale,
  EmptyState,
  Label,
} from '../ui';
import { conditionsCopy as c } from '../conditions/conditionsCopy';
import { rulesStore as useRulesStore } from '../conditions/rulesStore';
import { ruleName } from '../conditions/ruleName';
import { scheduleLabel } from '../schedule/scheduleLabel';
import { useRuntime } from '../ports/useRuntime';
import { Icon } from '../ui/Icon';
import { Reveal } from '../ui/Reveal';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { toggleRule, deleteRule } from './lib/mutations';
import { SchedulePlanError } from '../schedule/scheduleRepresentability';
import { useLockDecision, useRuntimeStatus } from '../lock/selectors';
import { haptic } from '../ui/haptics';
import { useLockListPicker } from '../app-selection/useLockListPicker';
import { ruleNeedsSetup } from '../permissions/useSetupNeeds';
export function ConditionsScreen({
  onAdd,
  onEdit,
  onNeeds,
}: {
  onAdd: () => void;
  onEdit: (id: string) => void;
  onNeeds?: () => void;
}) {
  const { rules, migrationNote } = useRulesStore((s) => s.data),
    runtime = useRuntime(),
    { open: openLockList } = useLockListPicker(),
    { scheduleIssue } = useRuntimeStatus(),
    [deleting, setDeleting] = useState<string | null>(null),
    decision = useLockDecision(),
    toggled = useRef<boolean | null>(null);
  useEffect(() => {
    if (toggled.current === null) return;
    const resumed = toggled.current;
    toggled.current = null;
    haptic(resumed && decision.state === 'locked' ? 'lock' : 'commit');
  }, [rules, decision.state]);
  const deletingBank = rules.find((rule) => rule.id === deleting)?.mode.kind === 'bank';
  const ordered = [...rules].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <ScreenShell dock
      safeBottom={false}
      overlay={<>
        <ScreenTimePickerHost />
        <ConfirmSheet
          open={deleting !== null}
          title={deletingBank ? bankConditionCopy.removeTitle : c.deleteTitle}
          body={deletingBank ? bankConditionCopy.remove : c.deleteBody}
          confirm={c.delete}
          cancel={c.keepRule}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            if (deleting) {
              deleteRule(deleting);
              runtime.analytics.track('condition_deleted');
              haptic('commit');
            }
            setDeleting(null);
          }}
        />
      </>}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
        <View style={{ flex: 1 }}><Heading title={c.title} /></View>
        {ordered.length && !rules.some((rule) => rule.mode.kind === 'bank') ? (
          <PressableScale label={c.add} onPress={onAdd}
            style={{ minHeight: t.control.inline, paddingHorizontal: t.space.lg,
              flexDirection: 'row', alignItems: 'center', gap: t.space.sm,
              borderRadius: t.radius.pill, backgroundColor: t.surface.softChoice,
              borderWidth: t.stroke.hairline, borderColor: t.surface.transparent }}>
            <Icon name="plus" size={t.icon.md} variant="utility" />
            <Label variant="label">{c.add}</Label>
          </PressableScale>
        ) : null}
      </View>
      {scheduleIssue ? (
        <View
          style={{
            padding: t.space.lg,
            borderRadius: t.radius.card,
            backgroundColor: t.surface.softChoice,
            borderWidth: t.stroke.hairline,
            borderColor: t.surface.transparent,
          }}>
          <Label style={{ color: t.text.secondary }}>{c.scheduleRecovery}</Label>
        </View>
      ) : null}
      {migrationNote ? (
        <View
          style={{
            padding: t.space.lg,
            borderRadius: t.radius.card,
            backgroundColor: t.surface.softChoice,
            borderWidth: t.stroke.hairline,
            borderColor: t.surface.transparent,
            gap: t.space.sm,
          }}>
          <Label>{migrationNote}</Label>
          <PressableScale
            label={c.dismissRetired}
            onPress={() => useRulesStore.getState().patch({ migrationNote: null })}
            style={{ alignSelf: 'flex-start', minHeight: t.control.inline, justifyContent: 'center' }}>
            <Label variant="support" style={{ color: t.text.primary }}>
              {c.dismissRetired}
            </Label>
          </PressableScale>
        </View>
      ) : null}
      {ordered.length ? (
        <>
          {ordered.map((rule, index) => (
            <Reveal key={rule.id} index={index}>
              <RuleCard
                title={rule.mode.kind === 'bank' ? bankConditionCopy.name(rule.mode.activity, rule.mode.difficulty) : ruleName(rule)}
                schedule={rule.mode.kind === 'bank' ? bankTrade(rule.mode.activity, rule.mode.difficulty) : scheduleLabel(rule.schedule)}
                icon={rule.activity}
                status={rule.mode.kind === 'bank' ? (rule.activity === 'gym' ? 'token-gym' : 'token-walking') : undefined}
                enabled={rule.enabled}
                onOpen={() => onEdit(rule.id)}
                onToggle={(value) => {
                  try {
                    toggleRule(rule.id, value, {
                      now: runtime.clock.now(),
                      timezone: runtime.clock.timezone(),
                    });
                    toggled.current = value;
                    if (value && ruleNeedsSetup({ ...rule, enabled: true })) onNeeds?.();
                  } catch (error) {
                    if (!(error instanceof SchedulePlanError) && !(error instanceof BankConditionConflict)) throw error;
                    notify(error instanceof BankConditionConflict ? bankConditionCopy.exclusive : c.scheduleLimit);
                    haptic('error');
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
      <View style={{ backgroundColor: t.surface.softChoice, borderRadius: t.radius.pill, borderWidth: t.stroke.hairline, borderColor: t.surface.transparent }}>
        <SettingsRow title="Lock list" icon="lock" onPress={() => void openLockList()} />
      </View>
    </ScreenShell>
  );
}
