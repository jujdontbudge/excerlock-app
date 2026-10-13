import { getResidencyModule } from '../../../../../modules/excerlock-residency';
import type { ResidencyAnchor } from '../detection/AwakeSession';

export function createResidencyModuleClient(): ResidencyAnchor | null {
  const module = getResidencyModule();
  if (!module) return null;
  let last = '';
  return {
    setWanted: (wanted, foreground, until) => {
      const next = `${wanted}:${foreground}:${until}`;
      if (next === last) return;
      last = next;
      module.setWanted(wanted, foreground, until);
    },
  };
}
