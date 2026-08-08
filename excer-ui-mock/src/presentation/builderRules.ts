import {
  conditionCatalog,
  type ConditionCatalogEntry,
} from '@/content/conditions';

import type { BuilderDraft, DemoState } from './types';

type ConditionConflictInput = {
  catalogId: string;
  gymId?: string | null;
  kind: BuilderDraft['kind'];
};

const catalogById = new Map<string, ConditionCatalogEntry>(
  conditionCatalog.map((entry) => [entry.id, entry]),
);

export function conditionsHaveBankingConflict(
  candidate: ConditionConflictInput,
  existing: ConditionConflictInput,
) {
  if (
    !candidate.kind
    || !existing.kind
    || candidate.kind === 'state'
    || existing.kind === 'state'
    || candidate.kind === existing.kind
  ) {
    return false;
  }
  const candidateCatalog = catalogById.get(candidate.catalogId);
  const existingCatalog = catalogById.get(existing.catalogId);
  if (!candidateCatalog || !existingCatalog) return false;
  const sameSignal = candidateCatalog.signal === existingCatalog.signal
    && candidateCatalog.source === existingCatalog.source;
  if (!sameSignal) return false;
  if (candidateCatalog.requiresSavedGym || existingCatalog.requiresSavedGym) {
    return Boolean(candidate.gymId && candidate.gymId === existing.gymId);
  }
  return true;
}

export function formatClockMinutes(minutes: number | null) {
  if (minutes === null) return null;
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

export function getActiveWindowSummary(builder: BuilderDraft) {
  const start = formatClockMinutes(builder.activeWindowStartMinutes);
  const end = formatClockMinutes(builder.activeWindowEndMinutes);
  switch (builder.activeWindow) {
    case 'start-only':
      return `from ${start ?? '7:00 AM'}`;
    case 'end-only':
      return `until ${end ?? '10:00 PM'}`;
    case 'start-end':
    case 'guided':
      return `${start ?? '7:00 AM'}–${end ?? '10:00 PM'}`;
    case 'anytime':
      return 'Anytime';
  }
}

export function getEventThresholdSummary(
  catalogId: string,
  value: number | null,
  units: DemoState['settings']['units'],
) {
  if (catalogId === 'gym-arrive') return 'arrival check-in';
  if (value === null) return 'goal';
  if (catalogId === 'walk-steps-event') return `${value.toLocaleString('en-US')} steps`;
  if (catalogId.startsWith('run-') || catalogId.startsWith('cycle-')) {
    return `${value} ${units === 'miles' ? 'mi' : 'km'}`;
  }
  if (catalogId.startsWith('swim-')) return `${value.toLocaleString('en-US')} m`;
  if (catalogId === 'calories-event') return `${value.toLocaleString('en-US')} kcal`;
  if (catalogId === 'active-minutes-event') return `${value} active min`;
  return `${value} workout min`;
}

export function getRateQuantumSummary(
  catalogId: string,
  rateMinutes: number | null,
  units: DemoState['settings']['units'],
) {
  const earned = rateMinutes ?? 5;
  if (catalogId === 'walk-steps-rate') return `1,000 steps = ${earned} min`;
  if (catalogId === 'run-distance-rate') return `1 ${units === 'miles' ? 'mi' : 'km'} = ${earned} min`;
  if (catalogId === 'cycle-distance-rate') return `${units === 'miles' ? '3 mi' : '5 km'} = ${earned} min`;
  if (catalogId === 'swim-distance-rate') return `100 ${units === 'miles' ? 'yd' : 'm'} = ${earned} min`;
  if (catalogId === 'calories-rate') return `100 kcal = ${earned} min`;
  if (catalogId === 'active-minutes-rate') return `10 active min = ${earned} min`;
  return `10 min at the gym = ${earned} min`;
}

export function getRewardSummary(builder: BuilderDraft) {
  if (builder.reward === 'rest-of-day') return 'open for the rest of today';
  if (builder.reward === 'set-period') return `open for ${builder.rewardMinutes ?? 15} min`;
  return `add ${builder.rewardMinutes ?? 5} min`;
}

export function getEventExecutionSummary(builder: BuilderDraft) {
  const cooldownDuration = builder.cooldownMinutes
    ? `${builder.cooldownMinutes < 60
      ? `${builder.cooldownMinutes} min`
      : `${builder.cooldownMinutes / 60} h`} cooldown`
    : 'no cooldown';
  if (!builder.repeatable) {
    const inactiveCap = builder.dailyCap !== null && builder.dailyCap !== 1
      ? ` · ${builder.dailyCap === 'unlimited' ? 'Unlimited' : builder.dailyCap} cap inactive while Repeatable is No`
      : '';
    const cooldown = builder.cooldownMinutes
      ? `${cooldownDuration} inactive while Repeatable is No`
      : cooldownDuration;
    return `once daily${inactiveCap} · ${cooldown}`;
  }
  const cap = builder.dailyCap === 'unlimited'
    ? 'unlimited completions'
    : `up to ${builder.dailyCap ?? 1}× daily`;
  return `${cap} · ${cooldownDuration}`;
}

export function getBuilderRuleSummary(
  builder: BuilderDraft,
  units: DemoState['settings']['units'],
  gymName?: string,
) {
  if (!builder.catalogId || !builder.kind) return '';
  const activeWindow = getActiveWindowSummary(builder);
  if (builder.kind === 'event') {
    return `${gymName ? `${gymName} · ` : ''}${getEventThresholdSummary(builder.catalogId, builder.eventThreshold, units)} · ${getRewardSummary(builder)} · ${getEventExecutionSummary(builder)} · ${activeWindow}`;
  }
  if (builder.kind === 'state') {
    return `Apps stay open while active · balance drains normally · ${builder.stateGraceSeconds ?? 30} sec grace · ${activeWindow}`;
  }
  return `${getRateQuantumSummary(builder.catalogId, builder.rateMinutes, units)} · continuous · ${activeWindow}`;
}

export function getEventCardSubtitle(ruleSummary: string, catalogId: string) {
  const segments = ruleSummary
    .split(' · ')
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length <= 1) return ruleSummary;
  return segments
    .slice(0, catalogId.startsWith('gym-') ? 3 : 2)
    .join(' · ');
}
