import { router, type Href } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";

import { PillButton, Screen, SectionHeader } from "@/ui";
import { useTheme } from "@/ui";

import { ConditionBuilderSheet } from "../builder/ConditionBuilderSheet";
import { ConditionCard } from "../components/cards/ConditionCard";
import { EmptyStart } from "../components/EmptyStart";
import { LockHero } from "../components/LockHero";
import { ShortcutRow } from "../components/ShortcutRow";
import { StatsRow } from "../components/StatsRow";
import { toConditionCards } from "../model/conditionCards";
import { deriveLockHero, type LiveState } from "../model/lockState";
import { getHomeAppRuntime } from "../signals/appRuntime";
import type { HomeSignalFeed } from "../signals/homeSignalFeed";
import { useHealthEventClaims } from "../signals/useHealthEventClaims";
import { useHomeSignals } from "../signals/useHomeSignals";
import {
  getGymPresenceController,
  type GymPresenceController,
} from "../signals/gymPresenceController";
import {
  getWalkingSessionController,
  type WalkingSessionController,
} from "../signals/walkingSessionController";
import { selectActiveConditions, selectPickerContext } from "../store/homeState";
import { useHomeStore } from "../store/homeStore";
import {
  reviewCoordinator as defaultReviewCoordinator,
  type ReviewCoordinatorContract,
} from "@/review";
import {
  expoBannerPhotoPicker,
  type BannerPhotoPicker,
} from "../banners/bannerPhotoPicker";

export interface HomeScreenProps {
  /** Injected by tests and by the Phase-3 composition root. */
  feed?: HomeSignalFeed;
  /** Local wall-clock milliseconds — the ledger never reads a clock itself. */
  now?: () => number;
  /** System photo picker boundary, injected by the own-photo flow test. */
  bannerPhotoPicker?: BannerPhotoPicker;
  gymPresenceController?: Pick<GymPresenceController, "checkIn">;
  walkingSessionController?: Pick<WalkingSessionController, "start">;
  openProppedScan?: (conditionId: string) => void;
  reviewCoordinator?: Pick<ReviewCoordinatorContract, "initialize" | "onUnlockMoment">;
}

/**
 * Tab 1. It composes the lock hero, today's condition cards and the builder,
 * and owns none of their rules: balances come from `@excerlock/ledger`, card and
 * picker rules from `@excerlock/condition-model`, live values from SignalKit.
 */
export function HomeScreen({
  feed,
  now,
  bannerPhotoPicker = expoBannerPhotoPicker,
  gymPresenceController = getGymPresenceController(),
  walkingSessionController = getWalkingSessionController(),
  openProppedScan = (conditionId) =>
    router.push(
      `/treadmill-scan?conditionId=${encodeURIComponent(conditionId)}` as Href,
    ),
  reviewCoordinator = defaultReviewCoordinator,
}: HomeScreenProps = {}) {
  const appRuntime =
    feed === undefined || now === undefined
      ? getHomeAppRuntime()
      : undefined;
  const signalFeed = feed ?? appRuntime!.feed;
  const currentTime = now ?? appRuntime!.now;
  const { spacing } = useTheme();
  const [builderOpen, setBuilderOpen] = useState(false);

  const conditions = useHomeStore((state) => state.conditions);
  const conditionBanners = useHomeStore((state) => state.conditionBanners);
  const disabledConditionIds = useHomeStore((state) => state.disabledConditionIds);
  const journal = useHomeStore((state) => state.journal);
  const ledgerConfig = useHomeStore((state) => state.ledgerConfig);
  const savedPlaces = useHomeStore((state) => state.savedPlaces);
  const connectedSources = useHomeStore((state) => state.connectedSources);
  const addCondition = useHomeStore((state) => state.addCondition);
  const recordEventPayout = useHomeStore((state) => state.recordEventPayout);
  const firedConditionIds = useHomeStore((state) => state.firedConditionIds);

  const reading = useHomeSignals(signalFeed);
  const atMs = currentTime();
  useHealthEventClaims(reading, atMs);
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
  const firedToday = firedConditionIds(atMs);
  const cards = toConditionCards({
    conditions: selectActiveConditions({ conditions, disabledConditionIds }),
    reading,
    firedConditionIds: firedToday,
    placeNames,
    conditionBanners,
  });
  const completeCondition = async (conditionId: string) => {
    const condition = conditions.find(({ id }) => id === conditionId);
    if (condition?.catalogId !== "gym-arrival") {
      recordEventPayout(conditionId, currentTime());
      return;
    }

    await gymPresenceController.checkIn(conditionId);
  };
  const startProppedSession = async (conditionId: string) => {
    if (await walkingSessionController.start(conditionId, "propped")) {
      openProppedScan(conditionId);
    }
  };

  const hero = deriveLockHero({ journal, config: ledgerConfig, atMs, liveStates: liveStates(cards) });
  const firstObservedAtMs = useRef(atMs);
  useEffect(() => {
    void reviewCoordinator.initialize(firstObservedAtMs.current);
  }, [reviewCoordinator]);
  const previousHeroStatus = useRef(hero.status);
  useEffect(() => {
    const previous = previousHeroStatus.current;
    previousHeroStatus.current = hero.status;
    if (previous === "locked" && hero.status === "unlocked") {
      void reviewCoordinator.onUnlockMoment(atMs);
    }
  }, [atMs, hero.status, reviewCoordinator]);

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
              <ConditionCard
                key={card.id}
                model={card}
                onComplete={(id) => void completeCondition(id)}
                onStartSession={(id) => void walkingSessionController.start(id)}
                onStartProppedSession={(id) => void startProppedSession(id)}
              />
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
        bannerPhotoPicker={bannerPhotoPicker}
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
