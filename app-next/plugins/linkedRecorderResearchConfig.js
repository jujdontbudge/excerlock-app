const researchEnabled = () => process.env.EXCERLOCK_LINKED_RECORDER_TRACE === '1';

const bundleIds = {
  app: 'com.johansardar.excerlock.lab.linkedtrace',
  monitor: 'com.johansardar.excerlock.lab.linkedtrace.monitor',
  shield: 'com.johansardar.excerlock.lab.linkedtrace.shield',
  shieldaction: 'com.johansardar.excerlock.lab.linkedtrace.shieldaction',
  report: 'com.johansardar.excerlock.lab.linkedtrace.report',
};

function bundleIdentifier(kind, productionIdentifier) {
  return researchEnabled() ? bundleIds[kind] : productionIdentifier;
}

module.exports = { bundleIdentifier, bundleIds, researchEnabled };
