import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import {
  ConditionBuilderSheet,
  draftFromCondition,
  selectPickerContext,
  useHomeStore,
} from "@/home";
import { getLockController, type LockController } from "@/lock";
import { ScheduleRulesCard } from "@/schedule";
import { Screen, SectionHeader, useTheme } from "@/ui";

import { AllowanceCard } from "../components/AllowanceCard";
import { ConditionRow } from "../components/ConditionRow";
import { ManageEmpty } from "../components/ManageEmpty";
import { toConditionRows } from "../model/conditionRows";

/**
 * Tab 2. The daily allowance plus every saved condition, its switch, and its
 * two row edits: change it, or delete it.
 *
 * It creates nothing and computes nothing. The conditions, the switch and the
 * save all belong to Home's store; editing re-opens Home's builder on the
 * condition rather than growing a second one here.
 */
export interface ManageScreenProps {
  /** Injected by the cross-module owner round-trip test. */
  lockController?: LockController;
}

export function ManageScreen({
  lockController = getLockController(),
}: ManageScreenProps = {}) {
  const { spacing, typography } = useTheme();

  const conditions = useHomeStore((state) => state.conditions);
  const disabledConditionIds = useHomeStore((state) => state.disabledConditionIds);
  const savedPlaces = useHomeStore((state) => state.savedPlaces);
  const connectedSources = useHomeStore((state) => state.connectedSources);
  const baseAllowanceMinutes = useHomeStore(
    (state) => state.ledgerConfig.baseAllowanceMinutes,
  );
  const allowanceBeforeFullLock = useHomeStore(
    (state) => state.allowanceBeforeFullLock,
  );
  const setBaseAllowanceMinutes = useHomeStore(
    (state) => state.setBaseAllowanceMinutes,
  );
  const setFullLock = useHomeStore((state) => state.setFullLock);
  const updateCondition = useHomeStore((state) => state.updateCondition);
  const removeCondition = useHomeStore((state) => state.removeCondition);
  const setConditionEnabled = useHomeStore((state) => state.setConditionEnabled);

  /** Ids rather than conditions: the store stays the one copy of both. */
  const [editingId, setEditingId] = useState<string>();
  const [confirmingId, setConfirmingId] = useState<string>();

  // Manage writes the allowance, so its lifetime keeps the lock reader active
  // and the persisted Screen Time selection reconciled on every change.
  useEffect(() => {
    void lockController.start();
    return () => lockController.stop();
  }, [lockController]);

  const placeNames = useMemo(
    () => Object.fromEntries(savedPlaces.map(({ id, name }) => [id, name])),
    [savedPlaces],
  );
  const pickerContext = useMemo(
    () => selectPickerContext({ conditions, savedPlaces, connectedSources }),
    [conditions, savedPlaces, connectedSources],
  );

  const rows = toConditionRows({ conditions, disabledConditionIds, placeNames });
  const editing = conditions.find(({ id }) => id === editingId);

  const remove = (conditionId: string) => {
    removeCondition(conditionId);
    setConfirmingId(undefined);
  };

  return (
    <>
      <Screen testID="manage-screen">
        <ScrollView
          contentContainerStyle={{
            gap: spacing.lg,
            paddingBottom: spacing.xxl * 2,
            paddingHorizontal: spacing.gutter,
            paddingTop: spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text accessibilityRole="header" style={typography.title}>
            Manage
          </Text>

          {/* The allowance is not a condition, so it is offered from the first
              launch — before anything has been built to earn on top of it. */}
          <View style={{ gap: spacing.md }}>
            <SectionHeader
              title="Your economy"
              subtitle="What the day starts with, before any condition pays out."
            />
            <AllowanceCard
              allowance={{ baseAllowanceMinutes, allowanceBeforeFullLock }}
              onChange={setBaseAllowanceMinutes}
              onFullLockChange={setFullLock}
            />
          </View>

          <View style={{ gap: spacing.md }}>
            <SectionHeader
              title="Your rules"
              subtitle="Choose training days, planned time away, and exceptions."
            />
            <ScheduleRulesCard />
          </View>

          {rows.length === 0 ? (
            <ManageEmpty onGoHome={() => router.navigate("/")} />
          ) : (
            <View style={{ gap: spacing.md }}>
              <SectionHeader
                title="Your conditions"
                subtitle="Switch one off to pause it without losing how it was built."
              />
              {rows.map((row) => (
                <ConditionRow
                  key={row.id}
                  model={row}
                  confirmingDelete={confirmingId === row.id}
                  onToggle={(enabled) => setConditionEnabled(row.id, enabled)}
                  onEdit={() => setEditingId(row.id)}
                  onAskDelete={() => setConfirmingId(row.id)}
                  onConfirmDelete={() => remove(row.id)}
                  onCancelDelete={() => setConfirmingId(undefined)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </Screen>

      {/* Home's builder, re-opened on the condition: same steps, same preview,
          and `createId` returns the existing id so the save lands in place. */}
      {editing === undefined ? null : (
        <ConditionBuilderSheet
          key={editing.id}
          visible
          context={pickerContext}
          placeNames={placeNames}
          initialDraft={draftFromCondition(editing)}
          createId={() => editing.id}
          onSave={updateCondition}
          onClose={() => setEditingId(undefined)}
        />
      )}
    </>
  );
}
