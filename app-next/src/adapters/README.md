# adapters

Real implementations of the ports in `src/ports`, one directory per service. Each adapter is the only place
that knows its vendor or wire format; features keep talking to the port, and `src/demo/fakes` keeps a local
fake of the same interface. Adapters are composed by the runtime root, never imported by features.

- `sync/` — `SyncPort` over the VPS `/v1/sync/*` endpoints (P2-T08): outbox, schedule, restore merge.
