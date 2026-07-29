import type { ConfiguredCondition, PickerContext } from "@excerlock/condition-model";
import { useMemo, useReducer } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { PillButton, Screen, useTheme } from "@/ui";

import { builderCatalog, findOption } from "./builderCatalog";
import {
  builderReducer,
  canAdvance,
  draftCondition,
  EMPTY_DRAFT,
  type BuilderStep,
} from "./builderDraft";
import { CatalogStep } from "./steps/CatalogStep";
import { ConfigureStep } from "./steps/ConfigureStep";
import { PreviewStep } from "./steps/PreviewStep";
import { SourceStep } from "./steps/SourceStep";

const STEP_TITLES: Readonly<Record<BuilderStep, string>> = {
  catalog: "Pick a condition",
  source: "Pick a source",
  configure: "Set it up",
  preview: "Preview",
};

/**
 * The condition builder (PRD §3.15 non-tab surface 4). It renders picker
 * verdicts and a pure draft; every rule it appears to enforce is
 * `@excerlock/condition-model`'s.
 *
 * Step 5 — the condition's banner — is owed: the 21-banner library does not
 * exist yet, so every condition currently wears the default card treatment.
 */
export function ConditionBuilderSheet({
  visible,
  context,
  placeNames,
  onSave,
  onClose,
  createId = () => `condition-${Date.now()}`,
}: {
  visible: boolean;
  context: PickerContext;
  placeNames?: Readonly<Record<string, string>>;
  onSave: (condition: ConfiguredCondition) => void;
  onClose: () => void;
  createId?: () => string;
}) {
  const { colors, spacing, typography } = useTheme();
  const [draft, dispatch] = useReducer(builderReducer, EMPTY_DRAFT);
  const groups = useMemo(() => builderCatalog(context), [context]);
  const option = draft.catalogId === undefined ? undefined : findOption(groups, draft.catalogId);
  const preview = draftCondition(draft, "preview");

  const close = () => {
    dispatch({ type: "reset" });
    onClose();
  };

  const save = () => {
    const condition = draftCondition(draft, createId());
    if (condition !== undefined) {
      onSave(condition);
    }
    close();
  };

  if (!visible) {
    return null;
  }

  return (
    /**
     * A full-screen overlay rather than a React Native `Modal`: the sheet paints
     * its own surface, so a `Modal`'s separate host tree would buy nothing and
     * cost the shared theme context and a11y focus order.
     */
    <View accessibilityViewIsModal style={StyleSheet.absoluteFill}>
      <Screen testID="condition-builder" edges={["top", "left", "right", "bottom"]}>
        <View style={[styles.header, { paddingHorizontal: spacing.gutter, paddingBottom: spacing.md }]}>
          <Text accessibilityRole="header" style={typography.sheetTitle}>
            {STEP_TITLES[draft.step]}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={close}>
            <Text style={[typography.cardTitle, { color: colors.textSecondary }]}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{
            gap: spacing.lg,
            paddingBottom: spacing.xxl,
            paddingHorizontal: spacing.gutter,
          }}
          showsVerticalScrollIndicator={false}
        >
          {draft.step === "catalog" ? (
            <CatalogStep groups={groups} onPick={(option) => dispatch({ type: "pickCatalog", option })} />
          ) : null}

          {draft.step === "source" && option !== undefined ? (
            <SourceStep option={option} onPick={(source) => dispatch({ type: "pickSource", option: source })} />
          ) : null}

          {draft.step === "configure" && draft.catalogId !== undefined ? (
            <ConfigureStep catalogId={draft.catalogId} draft={draft} dispatch={dispatch} />
          ) : null}

          {draft.step === "preview" && preview !== undefined ? (
            <PreviewStep condition={preview} {...(placeNames === undefined ? {} : { placeNames })} />
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { gap: spacing.md, padding: spacing.gutter }]}>
          {draft.step === "catalog" ? null : (
            <PillButton
              label="Back"
              variant="secondary"
              onPress={() => dispatch({ type: "back" })}
              style={styles.action}
            />
          )}
          {draft.step === "configure" ? (
            <PillButton
              label="Preview"
              variant="white"
              disabled={!canAdvance(draft)}
              onPress={() => dispatch({ type: "next" })}
              style={styles.action}
            />
          ) : null}
          {draft.step === "preview" ? (
            <PillButton label="Save condition" variant="white" onPress={save} style={styles.action} />
          ) : null}
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  action: { flex: 1 },
  footer: { flexDirection: "row" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
});
