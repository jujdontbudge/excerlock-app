import { useCallback, useRef, useState } from "react";
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";

import {
  MILESTONES,
  type MilestoneId,
  type MilestoneKind,
} from "./catalog";

type VerticalFrame = Readonly<{ height: number; y: number }>;

const VIEWPORT_EDGE_INSET = 16;
const MAX_VIEWPORT_FRACTION = 0.8;

/**
 * Releases one unlock sequence only after every row containing a new badge is
 * materially inside the Analysis scroll viewport.
 */
export function useMilestoneUnlockViewport(
  sequence: readonly MilestoneId[],
) {
  const sequenceKey = sequence.join("|");
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const viewport = useRef<VerticalFrame>({ height: 0, y: 0 });
  const shelf = useRef<VerticalFrame | null>(null);
  const rows = useRef<Partial<Record<MilestoneKind, VerticalFrame>>>({});
  const targetKinds = targetKindsFor(sequence);

  const revealIfVisible = useCallback(() => {
    if (sequenceKey.length === 0 || readyKey === sequenceKey) return;

    const shelfFrame = shelf.current;
    const targetFrames = targetKinds.map((kind) => rows.current[kind]);
    if (
      viewport.current.height <= 0 ||
      shelfFrame === null ||
      targetFrames.some((frame) => frame === undefined)
    ) {
      return;
    }

    const measuredFrames = targetFrames as readonly VerticalFrame[];
    const targetTop =
      shelfFrame.y + Math.min(...measuredFrames.map(({ y }) => y));
    const targetBottom =
      shelfFrame.y +
      Math.max(...measuredFrames.map(({ height, y }) => y + height));
    const viewportTop = viewport.current.y + VIEWPORT_EDGE_INSET;
    const viewportBottom =
      viewport.current.y +
      viewport.current.height -
      VIEWPORT_EDGE_INSET;
    const visibleHeight = Math.max(
      0,
      Math.min(targetBottom, viewportBottom) -
        Math.max(targetTop, viewportTop),
    );
    const targetHeight = targetBottom - targetTop;
    const requiredHeight = Math.min(
      targetHeight,
      (viewport.current.height - VIEWPORT_EDGE_INSET * 2) *
        MAX_VIEWPORT_FRACTION,
    );

    if (visibleHeight >= requiredHeight) {
      setReadyKey(sequenceKey);
    }
  }, [readyKey, sequenceKey, targetKinds]);

  const onScrollViewLayout = useCallback(
    ({ nativeEvent }: LayoutChangeEvent) => {
      viewport.current = {
        height: nativeEvent.layout.height,
        y: viewport.current.y,
      };
      revealIfVisible();
    },
    [revealIfVisible],
  );

  const onScroll = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      viewport.current = {
        height: nativeEvent.layoutMeasurement.height,
        y: nativeEvent.contentOffset.y,
      };
      revealIfVisible();
    },
    [revealIfVisible],
  );

  const onShelfLayout = useCallback(
    ({ nativeEvent }: LayoutChangeEvent) => {
      shelf.current = nativeEvent.layout;
      revealIfVisible();
    },
    [revealIfVisible],
  );

  const onRowLayout = useCallback(
    (kind: MilestoneKind, { nativeEvent }: LayoutChangeEvent) => {
      rows.current[kind] = nativeEvent.layout;
      revealIfVisible();
    },
    [revealIfVisible],
  );

  return {
    isReady: sequenceKey.length > 0 && readyKey === sequenceKey,
    onRowLayout,
    onScroll,
    onScrollViewLayout,
    onShelfLayout,
  } as const;
}

function targetKindsFor(
  sequence: readonly MilestoneId[],
): readonly MilestoneKind[] {
  const kinds = new Set<MilestoneKind>();
  sequence.forEach((id) => {
    const milestone = MILESTONES.find((candidate) => candidate.id === id);
    if (milestone !== undefined) kinds.add(milestone.kind);
  });
  return [...kinds];
}
