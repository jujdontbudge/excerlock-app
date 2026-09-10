// Cold background tasks must register without waiting for a React layout mount.
import './src/runtime/productionRuntime';
import './src/engine/signals/location/registerLocationTasks';
// Expo Router must be last: official custom-entry contract.
import 'expo-router/entry';
