// Crash reporting must be installed before the runtime boot gate evaluates so a
// throw on the way to the gate is still reported.
import './src/packages/telemetry/SentryStartup';
// Cold background tasks must register without waiting for a React layout mount.
import './src/packages/runtime/productionRuntime';
import './src/packages/activity/registerLocationTasks';
// Expo Router must be last: official custom-entry contract.
import 'expo-router/entry';
