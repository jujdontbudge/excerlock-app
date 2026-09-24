import { useMemo } from 'react';
import { locationNeed, setupNeeds, type SetupNeed } from '../../domain/setupNeeds';
import { permissionsStore as usePermissionsStore } from '../../state/permissionsStore';
import { rulesStore as useRulesStore } from '../../state/rulesStore';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import type { Rule } from '../../domain/types';

/** What the enabled conditions still need, live from the stores (ADR 0043). */
export function useSetupNeeds() {
  const rules = useRulesStore((s) => s.data.rules),
    apps = useRulesStore((s) => s.data.lockedApps),
    permissions = usePermissionsStore((s) => s.data),
    gyms = useSettingsStore((s) => s.data.gymPlaces.length);
  return useMemo(() => {
    const needs = setupNeeds({ rules, permissions, apps, gyms }),
      location = locationNeed(rules);
    return { needs, location, permissions };
  }, [rules, permissions, apps, gyms]);
}

/** Which words describe a need: location is asked for walking or for a gym. */
export function needCopyKey(need: SetupNeed, location: 'always' | 'whenInUse' | null) {
  if (need !== 'location') return need;
  return location === 'always' ? 'walkLocation' : 'gymLocation';
}

/** Whether a condition just saved or turned on is missing anything it needs, so its ask can open. */
export function ruleNeedsSetup(rule: Rule) {
  return (
    rule.enabled &&
    setupNeeds({
      rules: [rule],
      permissions: usePermissionsStore.getState().data,
      apps: useRulesStore.getState().data.lockedApps,
      gyms: useSettingsStore.getState().data.gymPlaces.length,
    }).length > 0
  );
}

/** Where the permission screens open: the URL names the first thing still missing. */
export function permissionsHref(first?: SetupNeed) {
  const step =
    first ??
    setupNeeds({
      rules: useRulesStore.getState().data.rules,
      permissions: usePermissionsStore.getState().data,
      apps: useRulesStore.getState().data.lockedApps,
      gyms: useSettingsStore.getState().data.gymPlaces.length,
    })[0] ??
    'apps';
  return `/permissions/${step}` as const;
}
