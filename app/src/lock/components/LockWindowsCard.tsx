import { useState } from "react";
import { Text, View } from "react-native";

import { Card, PillButton, SectionHeader, useTheme } from "@/ui";

import type {
  RecurringLockWindow,
  SaveRecurringLockWindowResult,
} from "../model/recurringLockWindow";
import { LockWindowEditor } from "./LockWindowEditor";
import { LockWindowRow } from "./LockWindowRow";

export function LockWindowsCard({
  windows,
  onSave,
  onDelete,
}: {
  windows: readonly RecurringLockWindow[];
  onSave: (
    window: RecurringLockWindow,
  ) => Promise<SaveRecurringLockWindowResult>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const { spacing, typography } = useTheme();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const editing =
    editingId === null || editingId === "new"
      ? null
      : (windows.find(({ id }) => id === editingId) ?? null);

  return (
    <Card style={{ gap: spacing.md }} testID="lock-windows">
      <SectionHeader
        title="Lock windows"
        subtitle="Choose when your balance and Full Lock apply. Outside every window, apps stay open and the balance does not drain."
      />
      {windows.length === 0 && editingId === null ? (
        <Text style={typography.body}>No lock windows yet.</Text>
      ) : null}
      {windows.map((window) => (
        <LockWindowRow
          key={window.id}
          window={window}
          deleting={deletingId === window.id}
          onEdit={() => {
            setDeletingId(null);
            setEditingId(window.id);
          }}
          onAskDelete={() => {
            setEditingId(null);
            setDeletingId(window.id);
          }}
          onConfirmDelete={async () => {
            await onDelete(window.id);
            setDeletingId(null);
          }}
          onKeep={() => setDeletingId(null)}
        />
      ))}
      {editingId === null ? (
        <PillButton
          label="Add lock window"
          onPress={() => {
            setDeletingId(null);
            setEditingId("new");
          }}
        />
      ) : (
        <LockWindowEditor
          key={editingId}
          initial={editing}
          windows={windows}
          onSave={onSave}
          onCancel={() => setEditingId(null)}
          onSaved={() => setEditingId(null)}
        />
      )}
      <Text style={typography.caption}>
        Overlapping windows are rejected. Touching end and start times are allowed.
      </Text>
    </Card>
  );
}
