# Port contract suites

These reusable suites state adapter behavior at the port boundary. They live here without a `.test` suffix, so
each fake and native adapter invokes the same suite from its own test file. Fake adapters run them in Phase 1;
native adapters import the same contracts in Phase 2 and provide signal-injection harnesses where platform
callbacks would ordinarily supply events.
