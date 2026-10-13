import { getResidencyModule } from '../../../../../modules/excerlock-residency';
import type { ResidencyAnchor } from '../detection/AwakeSession';

export function createResidencyModuleClient(): ResidencyAnchor | null {
  const module = getResidencyModule();
  if (!module) return null;
  return { setWanted: (wanted, foreground) => module.setWanted(wanted, foreground) };
}
