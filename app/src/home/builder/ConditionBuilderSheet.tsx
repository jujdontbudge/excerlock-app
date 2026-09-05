import type { ConfiguredCondition, PickerContext } from "@excerlock/condition-model";
import { useMemo, useReducer } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  DismissalBlur,
  FLOATING_TAB_BAR_HEIGHT,
  PillButton,
  Screen,
  useTheme,
} from "@/ui";

import { builderCatalog, findOption } from "./builderCatalog";
import {
  builderReducer,
  canAdvance,
  draftCondition,
  EMPTY_DRAFT,
  type BuilderDraft,
  type BuilderStep,
} from "./builderDraft";
import { CatalogStep } from "./steps/CatalogStep";
import { GymStep } from "./steps/GymStep";
import { ConfigureStep } from "./steps/ConfigureStep";
import { PreviewStep } from "./steps/PreviewStep";
import { SourceStep } from "./steps/SourceStep";
import { BannerStep } from "./steps/BannerStep";
import {
  expoBannerPhotoPicker,
  type BannerPhotoPicker,
} from "../banners/bannerPhotoPicker";
import type { BannerSelection } from "../banners/bannerCatalog";
import type { GymSetup } from "./gymSetup";

const STEP_TITLES: Readonly<Record<BuilderStep, string>> = {
  catalog: "Pick a condition",
  place: "Which gym?",
  source: "Pick a source",
  configure: "Set it up",
  banner: "Choose a banner",
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
  initialDraft = EMPTY_DRAFT,
  onSave,
  onClose,
  createId = () => `condition-${Date.now()}`,
  bannerPhotoPicker = expoBannerPhotoPicker,
  gymSetup,
}: {
  visible: boolean;
  context: PickerContext;
  placeNames?: Readonly<Record<string, string>>;
  /**
   * Where the sheet opens. Creating starts on the empty draft; editing starts
   * on `draftFromCondition`, which lands on the configure step — so the sheet
   * reads it once, on mount, and a caller that edits a second condition must
   * mount a second sheet (a `key` on the condition's id).
   */
  initialDraft?: BuilderDraft;
  onSave: (condition: ConfiguredCondition, banner: BannerSelection) => void;
  onClose: () => void;
  createId?: () => string;
  bannerPhotoPicker?: BannerPhotoPicker;
  /**
   * How the gym step finds, saves and edits gyms. Absent on a surface that only
   * re-opens saved conditions, which never reaches that step.
   */
  gymSetup?: GymSetup;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  const [draft, dispatch] = useReducer(builderReducer, initialDraft);
  const groups = useMemo(() => builderCatalog(context), [context]);
  const option = draft.catalogId === undefined ? undefined : findOption(groups, draft.catalogId);
  const preview = draftCondition(draft, "preview");

  const close = () => {
    dispatch({ type: "reset" });
    onClose();
  };

  const save = () => {
    const condition = draftCondition(draft, createId());
    if (condition !== undefined && draft.banner !== undefined) {
      onSave(condition, draft.banner);
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
      <DismissalBlur
        accessibilityLabel="Dismiss condition builder"
        onDismiss={close}
      />
      <View
        style={[
          styles.panel,
          {
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
          },
        ]}
      >
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
              <CatalogStep
                groups={groups}
                onPick={(option) => dispatch({ type: "pickCatalog", option })}
              />
            ) : null}

            {draft.step === "place" && option !== undefined ? (
              <GymStep
                option={option}
                {...(gymSetup === undefined ? {} : { setup: gymSetup })}
                {...(draft.placeId === undefined ? {} : { selectedPlaceId: draft.placeId })}
                onPick={(placeId) => dispatch({ type: "pickPlace", placeId })}
              />
            ) : null}

            {draft.step === "source" && option !== undefined ? (
              <SourceStep option={option} onPick={(source) => dispatch({ type: "pickSource", option: source })} />
            ) : null}

            {draft.step === "configure" && draft.catalogId !== undefined ? (
              <ConfigureStep catalogId={draft.catalogId} draft={draft} dispatch={dispatch} />
            ) : null}

            {draft.step === "banner" && draft.catalogId !== undefined ? (
              <BannerStep
                catalogId={draft.catalogId}
                selection={draft.banner}
                photoPicker={bannerPhotoPicker}
                onSelect={(banner) => dispatch({ type: "pickBanner", banner })}
              />
            ) : null}

            {draft.step === "preview" && preview !== undefined ? (
              <PreviewStep
                condition={preview}
                banner={draft.banner}
                {...(placeNames === undefined ? {} : { placeNames })}
              />
            ) : null}
          </ScrollView>

          {/* The tab bar floats over this sheet, so the actions must sit above
              it — otherwise a tap on "Preview" lands on a tab and switches away. */}
          <View
            style={[
              styles.footer,
              {
                gap: spacing.md,
                padding: spacing.gutter,
                paddingBottom: spacing.gutter + FLOATING_TAB_BAR_HEIGHT,
              },
            ]}
          >
            {/* Back retraces the steps the sheet opened on — never behind them. */}
            {draft.step === initialDraft.step ? null : (
              <PillButton
                label="Back"
                variant="secondary"
                onPress={() => dispatch({ type: "back" })}
                style={styles.action}
              />
            )}
            {draft.step === "place" ? (
              <PillButton
                label="Continue"
                variant="white"
                disabled={!canAdvance(draft)}
                onPress={() => dispatch({ type: "next" })}
                style={styles.action}
              />
            ) : null}
            {draft.step === "configure" ? (
              <PillButton
                label="Choose banner"
                variant="white"
                disabled={!canAdvance(draft)}
                onPress={() => dispatch({ type: "next" })}
                style={styles.action}
              />
            ) : null}
            {draft.step === "banner" ? (
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
    </View>
  );
}

const styles = StyleSheet.create({
  action: { flex: 1 },
  footer: { flexDirection: "row" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  panel: {
    bottom: 0,
    height: "96%",
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
  },
});
