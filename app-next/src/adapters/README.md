# adapters

Real-world boundaries: the implementations of the ports in `src/ports`, plus the few boundaries that are
not ports of their own (the VPS API client, the App Store links and the rating policy). Each directory is
one responsibility with a README, and is the only place that knows its vendor or wire format; features keep
talking to the port, and `src/demo/fakes` keeps a local fake of the same interface. Nothing here is imported
by `domain/`; adapters are composed by the runtime root, and screens reach them through `runtime`
composition or, for the few Settings rows that are pure device actions (Rate, Share, Manage subscription),
directly.

- `api/` — the HTTP client to the VPS on Supabase JWTs, `SupportPort` over `POST /v1/support`,
  account deletion over `DELETE /v1/user`, and the failure-to-copy mapping.
- `appStore/` — the App Store id and the product, write-review and manage-subscription URLs.
- `notifications/` — `NotificationsPort` over expo-notifications: the trial and walk-lease schedulers,
  the catalog and the tap-through landing table.
- `review/` — the App Store rating policy binding and the only `expo-store-review` import.
- `sync/` — `SyncPort` over the VPS `/v1/sync/*` endpoints (P2-T08): outbox, schedule, restore merge.
