import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";

import { PillButton, Screen, SectionHeader } from "@/ui";
import { useTheme } from "@/ui";

import { ConditionBuilderSheet } from "../builder/ConditionBuilderSheet";
import { ConditionCard } from "../components/cards/ConditionCard";
import { EmptyStart } from "../components/EmptyStart";
import { LockHero } from "../components/LockHero";
import { ShortcutRow } from "../components/ShortcutRow";
import { StatsRow } from "../components/StatsRow";
import { localWallClockNow } from "../model/clock";
import { toConditionCards } from "../model/conditionCards";
import { deriveLockHero, type LiveState } from "../model/lockState";
import { createFixtureHomeSignalFeed } from "../signals/fixtureFeed";
import type { HomeSignalFeed } from "../signals/homeSignalFeed";
import { useHomeSignals } from "../signals/useHomeSignals";
import { selectActiveConditions, selectPickerContext, useHomeStore } from "../store/homeStore";

/** One feed for the app's lifetime — a screen remount must not restart the fixtures. */
let appFeed: HomeSignalFeed | undefined;
function sharedFeed(): HomeSignalFeed {
  appFeed ??= createFixtureHomeSignalFeed();
  return appFeed;
}

export interface HomeScreenProps {
  /** Injected by tests and by the Phase-3 composition root. */
  feed?: HomeSignalFeed;
  /** Local wall-clock milliseconds — the ledger never reads a clock itself. */
  now?: () => number;
}

/**
 * Tab 1. It composes the lock hero, today's condition cards and the builder,
 * and owns none of their rules: balances come from `@excerlock/ledger`, card and
 * picker rules from `@excerlock/condition-model`, live values from SignalKit.
 */
export function HomeScreen({ feed = sharedFeed(), now = localWallClockNow }: HomeScreenProps = {}) {
  const { spacing } = useTheme();
  const [builderOpen, setBuilderOpen] = useState(false);

  const conditions = useHomeStore((state) => state.conditions);
  const disabledConditionIds = useHomeStore((state) => state.disabledConditionIds);
  const journal = useHomeStore((state) => state.journal);
  const ledgerConfig = useHomeStore((state) => state.ledgerConfig);
  const savedPlaces = useHomeStore((state) => state.savedPlaces);
  const connectedSources = useHomeStore((state) => state.connectedSources);
  const addCondition = useHomeStore((state) => state.addCondition);
  const recordEventPayout = useHomeStore((state) => state.recordEventPayout);
  const firedConditionIds = useHomeStore((state) => state.firedConditionIds);

  const reading = useHomeSignals(feed);
  const atMs = now();
  const placeNames = useMemo(
    () => Object.fromEntries(savedPlaces.map(({ id, name }) => [id, name])),
    [savedPlaces],
  );
  const pickerContext = useMemo(
    () => selectPickerContext({ conditions, savedPlaces, connectedSources }),
    [conditions, savedPlaces, connectedSources],
  );

  // A condition switched off in Manage keeps its slot in the picker context but
  // leaves the dashboard entirely — an off condition has nothing to show today.
  const cards = toConditionCards({
    conditions: selectActiveConditions({ conditions, disabledConditionIds }),
    reading,
    firedConditionIds: firedConditionIds(atMs),
    placeNames,
  });
  const hero = deriveLockHero({ journal, config: ledgerConfig, atMs, liveStates: liveStates(cards) });

  return (
    <>
      <Screen testID="home-screen" variant="dashboard">
      {conditions.length === 0 ? (
        <EmptyStart onCreate={() => setBuilderOpen(true)} />
      ) : (
        <ScrollView
          contentContainerStyle={{
            gap: spacing.lg,
            paddingBottom: spacing.xxl * 2,
            paddingHorizontal: spacing.gutter,
            paddingTop: spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
        >
          <LockHero model={hero} />
          <StatsRow model={hero} />

          <View style={{ gap: spacing.md }}>
            <SectionHeader title="Today's conditions" />
            {cards.map((card) => (
              <ConditionCard key={card.id} model={card} onComplete={(id) => recordEventPayout(id, atMs)} />
            ))}
          </View>

          <PillButton
            label="Add condition"
            variant="secondary"
            trailingIcon="arrowRight"
            onPress={() => setBuilderOpen(true)}
          />

          <View style={{ gap: spacing.sm }}>
            <ShortcutRow label="Edit" icon="manage" onPress={() => router.navigate("/manage")} />
            <ShortcutRow label="Analysis" icon="analysis" onPress={() => router.navigate("/analysis")} />
          </View>
        </ScrollView>
      )}
      </Screen>

      {/* The builder is an overlay, not part of the dashboard surface — it sits
          beside the gradient rather than inside it. */}
      <ConditionBuilderSheet
        visible={builderOpen}
        context={pickerContext}
        placeNames={placeNames}
        onSave={addCondition}
        onClose={() => setBuilderOpen(false)}
      />
    </>
  );
}

function liveStates(cards: ReturnType<typeof toConditionCards>): readonly LiveState[] {
  return cards
    .filter((card) => card.kind === "state" && card.active)
    .map((card) => ({ conditionId: card.id, name: card.title }));
}
