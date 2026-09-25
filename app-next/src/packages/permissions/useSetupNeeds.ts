import { useMemo } from 'react';
import { locationNeed, setupNeeds, type SetupNeed } from './setupNeeds';
import { permissionsStore as usePermissionsStore } from './permissionsStore';
import { rulesStore as useRulesStore } from '../conditions/rulesStore';
import { settingsStore as useSettingsStore } from '../preferences/settingsStore';
import type { Rule } from '../model/types';

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

export function needCopyKey(need: SetupNeed, location: 'always' | 'whenInUse' | null) {
  if (need !== 'location') return need;
  return location === 'always' ? 'walkLocation' : 'gymLocation';
}

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
