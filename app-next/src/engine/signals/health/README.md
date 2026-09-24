# Health signals (fixtures only)

The app ships no HealthKit (App Review Guideline 2.5.1; ADR 0044): steps and walking come from Core
Motion. This folder keeps the `HealthProvider` contract and `FixtureHealthProvider` replays used by
engine tests. The native HealthKit adapter, the `@kingstinct/react-native-healthkit` dependency,
its background-delivery bootstrap and the HealthKit entitlements were removed. Reintroducing
HealthKit needs a visible Apple Health feature in the UI and a new ADR.
