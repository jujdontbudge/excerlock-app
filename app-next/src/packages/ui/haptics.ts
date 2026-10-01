import { useEffect, useRef } from 'react';
import { AccessibilityInfo, AppState, Platform } from 'react-native';
import { isDevice } from 'expo-device';
import * as Haptics from 'expo-haptics';

export type Haptic =
  | 'detent'
  | 'select'
  | 'tap'
  | 'beat'
  | 'lock'
  | 'commit'
  | 'warning'
  | 'success'
  | 'error'
  | 'unlock';
export type HapticIntent = Haptic | 'none';
export type HapticRecord = { kind: Haptic; at: number };

const weight: Record<Haptic, number> = {
  detent: 0,
  select: 1,
  tap: 2,
  beat: 3,
  lock: 4,
  commit: 5,
  warning: 6,
  success: 7,
  error: 8,
  unlock: 9,
};
const minimumGap: Record<Haptic, number> = {
  detent: 45,
  select: 60,
  tap: 80,
  beat: 250,
  lock: 250,
  commit: 400,
  warning: 700,
  success: 700,
  error: 700,
  unlock: 5000,
};
const shadowAfterStrong = 120;
const unlockSignatureGap = 130;
const logLimit = 24;

let enabled = true;
let reduceMotion = false;
let pending: Haptic | null = null;
let activeSince = Date.now();
let lastStrong = { weight: -1, at: 0 };
const lastPlayed = new Map<Haptic, number>();
const timers = new Set<ReturnType<typeof setTimeout>>();
let log: readonly HapticRecord[] = [];
const listeners = new Set<() => void>();

const deviceCanPlay = () =>
  process.env.NODE_ENV !== 'test' && Platform.OS === 'ios' && isDevice;
const foreground = () => AppState.currentState === 'active';

const settle = (result: Promise<void>) => void result.catch(() => undefined);
const impact = (style: Haptics.ImpactFeedbackStyle) => () => settle(Haptics.impactAsync(style));
const notify = (type: Haptics.NotificationFeedbackType) => () => settle(Haptics.notificationAsync(type));
const effects: Record<Exclude<Haptic, 'unlock'>, () => void> = {
  detent: () => settle(Haptics.selectionAsync()),
  select: () => settle(Haptics.selectionAsync()),
  tap: impact(Haptics.ImpactFeedbackStyle.Light),
  beat: impact(Haptics.ImpactFeedbackStyle.Soft),
  lock: impact(Haptics.ImpactFeedbackStyle.Rigid),
  commit: impact(Haptics.ImpactFeedbackStyle.Medium),
  warning: notify(Haptics.NotificationFeedbackType.Warning),
  success: notify(Haptics.NotificationFeedbackType.Success),
  error: notify(Haptics.NotificationFeedbackType.Error),
};

function later(ms: number, run: () => void) {
  const timer = setTimeout(() => {
    timers.delete(timer);
    run();
  }, ms);
  timers.add(timer);
  return () => {
    clearTimeout(timer);
    timers.delete(timer);
  };
}

function record(kind: Haptic, at: number) {
  log = [{ kind, at }, ...log].slice(0, logLimit);
  listeners.forEach((listener) => listener());
}

function play(kind: Haptic) {
  if (!enabled || !foreground()) return;
  const now = Date.now();
  if (now - (lastPlayed.get(kind) ?? -Infinity) < minimumGap[kind]) return;
  if (weight[kind] < lastStrong.weight && now - lastStrong.at < shadowAfterStrong) return;
  lastPlayed.set(kind, now);
  if (weight[kind] >= weight.commit) lastStrong = { weight: weight[kind], at: now };
  record(kind, now);
  if (!deviceCanPlay()) return;
  if (kind !== 'unlock') return effects[kind]();
  if (reduceMotion) return effects.success();
  effects.lock();
  later(unlockSignatureGap, () => {
    if (enabled && foreground()) effects.success();
  });
}

function flush() {
  const kind = pending;
  pending = null;
  if (kind) play(kind);
}

export function haptic(kind: HapticIntent) {
  if (kind === 'none' || !enabled || !foreground()) return;
  if (pending === null) queueMicrotask(flush);
  if (pending === null || weight[kind] > weight[pending]) pending = kind;
}

export function scheduleHaptic(kind: HapticIntent, delay: number) {
  if (kind === 'none' || !enabled || !foreground()) return () => undefined;
  if (delay <= 0) {
    haptic(kind);
    return () => undefined;
  }
  return later(delay, () => haptic(kind));
}

export function cancelHaptics() {
  timers.forEach(clearTimeout);
  timers.clear();
  pending = null;
}

export function setHapticsEnabled(value: boolean) {
  if (enabled === value) return;
  enabled = value;
  if (!value) cancelHaptics();
}

export function foregroundSettled(ms: number) {
  return foreground() && Date.now() - activeSince >= ms;
}

export function recentHaptics(): readonly HapticRecord[] {
  return log;
}

export function subscribeHaptics(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useHapticCue(kind: HapticIntent, delay: number, trigger: unknown = true) {
  useEffect(() => (trigger ? scheduleHaptic(kind, delay) : undefined), [kind, delay, trigger]);
}

export function useHapticOnChange<T>(value: T, kind: (next: T, previous: T) => HapticIntent) {
  const previous = useRef(value);
  useEffect(() => {
    if (Object.is(previous.current, value)) return;
    const before = previous.current;
    previous.current = value;
    haptic(kind(value, before));
  }, [value, kind]);
}

AppState.addEventListener('change', (state) => {
  if (state === 'active') activeSince = Date.now();
  else cancelHaptics();
});
void AccessibilityInfo.isReduceMotionEnabled()
  .then((value) => {
    reduceMotion = value;
  })
  .catch(() => undefined);
AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
  reduceMotion = value;
});
