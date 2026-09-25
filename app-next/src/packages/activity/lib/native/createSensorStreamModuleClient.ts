import type { SensorStreamModuleClient } from '../../../ports/SensorStreamPort';
export function createSensorStreamModuleClient(): SensorStreamModuleClient {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so fake runtimes never touch the native module
  const moduleSurface = require('../../../../../modules/excerlock-motion') as {
    getExcerlockMotionModule(): SensorStreamModuleClient;
  };
  return moduleSurface.getExcerlockMotionModule();
}
