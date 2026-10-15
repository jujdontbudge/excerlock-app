const { createConfig } = require('react-native-device-activity/config-plugin/createExpoTargetConfig');

const createShieldConfigurationConfig = createConfig('shield-configuration');
const { bundleIdentifier } = require('../../plugins/linkedRecorderResearchConfig');

const fs = require('node:fs');
const path = require('node:path');

module.exports = (config) => {
  fs.copyFileSync(
    path.join(__dirname, '../../src/packages/enforcement/bankShieldCopy.json'),
    path.join(__dirname, 'BankShieldContent.generated.json'),
  );
  return {
    ...createShieldConfigurationConfig(config),
    appleTeamId: 'AX3C2B78YD',
    bundleIdentifier: bundleIdentifier('shield'),
    deploymentTarget: '17.4',
  };
};
