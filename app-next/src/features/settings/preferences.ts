import { validateRule } from '../../domain/validateRule';
import { settingsStore } from '../../state/settingsStore';
import { rulesStore } from '../../state/rulesStore';
export function setUnits(unit: 'km' | 'mi') {
  const rules = rulesStore
    .getState()
    .data.rules.map((r) =>
      r.mode.kind === 'target' && r.mode.metric === 'distance' ? { ...r, mode: { ...r.mode, unit } } : r,
    );
  if (rules.some((r) => validateRule(r).length)) throw new Error('Distance goal outside supported range');
  rulesStore.getState().patch({ rules });
  settingsStore.getState().patch({ units: unit });
}
