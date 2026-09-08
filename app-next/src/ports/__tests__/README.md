# Port contract suites

These reusable suites state adapter behavior at the port boundary. Fake adapters run them in Phase 1; native
adapters import the same contracts in Phase 2 and provide signal-injection harnesses where platform callbacks
would ordinarily supply events.
