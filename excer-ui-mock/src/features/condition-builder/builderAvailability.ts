import {
  conditionCatalog,
  conditionCatalogCopy,
  type ConditionCatalogEntry,
} from '@/content';
import {
  conditionsHaveBankingConflict,
  type DemoCondition,
  type PermissionOutcome,
  type SavedGym,
} from '@/presentation';

export type BuilderAvailability = {
  available: boolean;
  reason?: string;
};

type ExistingCondition = Pick<
  DemoCondition,
  'catalogId' | 'enabled' | 'gymId' | 'kind' | 'name'
>;

const catalogById = new Map<string, ConditionCatalogEntry>(
  conditionCatalog.map((entry) => [entry.id, entry]),
);

export function hasBuilderAppleHealthAccess({
  connected,
  permissionOutcome,
}: {
  connected: boolean;
  permissionOutcome: PermissionOutcome;
}) {
  return connected && permissionOutcome !== 'denied';
}

function samePlace(
  candidate: ConditionCatalogEntry,
  candidateGymId: string | undefined,
  existing: ExistingCondition,
) {
  if (!candidate.requiresSavedGym) return true;
  return Boolean(candidateGymId && candidateGymId === existing.gymId);
}

export function getPlaceAvailability({
  candidate,
  existingConditions,
  gymId,
}: {
  candidate: ConditionCatalogEntry;
  existingConditions: readonly ExistingCondition[];
  gymId?: string;
}): BuilderAvailability {
  for (const existing of existingConditions) {
    const existingCatalog = catalogById.get(existing.catalogId);
    if (!existingCatalog || !samePlace(candidate, gymId, existing)) continue;

    const sameIdentity =
      existing.kind === candidate.kind &&
      existingCatalog.signal === candidate.signal &&
      existingCatalog.source === candidate.source;
    if (sameIdentity) {
      return {
        available: false,
        reason: conditionCatalogCopy.disabledReasons.duplicate,
      };
    }

    if (existing.enabled && conditionsHaveBankingConflict({
      catalogId: candidate.id,
      gymId,
      kind: candidate.kind,
    }, existing)) {
      return {
        available: false,
        reason: conditionCatalogCopy.disabledReasons.conflict.replace(
          '{conditionName}',
          existing.name,
        ),
      };
    }
  }

  return { available: true };
}

export function getCatalogAvailability({
  appleHealthAvailable,
  candidate,
  existingConditions,
  savedGyms,
}: {
  appleHealthAvailable: boolean;
  candidate: ConditionCatalogEntry;
  existingConditions: readonly ExistingCondition[];
  savedGyms: readonly SavedGym[];
}): BuilderAvailability {
  if (candidate.requiresAppleHealth && !appleHealthAvailable) {
    return {
      available: false,
      reason: conditionCatalogCopy.disabledReasons.appleHealth,
    };
  }

  if (candidate.requiresSavedGym) {
    if (savedGyms.length === 0) {
      // The place step owns the empty-state Add gym action. Keeping the catalog
      // row available preserves that complete in-builder recovery path.
      return { available: true };
    }

    const gymAvailability = savedGyms.map((gym) => getPlaceAvailability({
      candidate,
      existingConditions,
      gymId: gym.id,
    }));
    return gymAvailability.find((availability) => availability.available)
      ?? gymAvailability[0]
      ?? { available: false, reason: conditionCatalogCopy.disabledReasons.savedGym };
  }

  return getPlaceAvailability({ candidate, existingConditions });
}
