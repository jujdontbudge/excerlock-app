import '@expo/metro-runtime';
// Crash reporting must be installed before the runtime boot gate evaluates so a
// throw on the way to the gate is still reported.
import './src/packages/telemetry/SentryStartup';
// Cold background tasks must register without waiting for a React layout mount.
import './src/packages/runtime/productionRuntime';
import './src/packages/activity/registerLocationTasks';
import './src/packages/updates/retainNativeSplash';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';
import { RootEntry } from './src/packages/runtime/RootEntry';

renderRootComponent(RootEntry);
