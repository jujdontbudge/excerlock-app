import type { SensorStreamModuleClient } from '../../../ports/SensorStreamPort';
export function createSensorStreamModuleClient(): SensorStreamModuleClient {
  const moduleSurface = require('../../../../../modules/excerlock-motion') as {
    getExcerlockMotionModule(): SensorStreamModuleClient;
  };
  return moduleSurface.getExcerlockMotionModule();
}
