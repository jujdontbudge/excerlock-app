# adapters

Real-world boundaries that are not ports of their own: the VPS API client, the App Store links and
the rating policy. Each folder is one responsibility with a README. Nothing here is imported by
`domain/`; screens reach these through `runtime` composition or, for the few Settings rows that are
pure device actions (Rate, Share, Manage subscription), directly.

- `api/` — the HTTP client to the VPS on Supabase JWTs, `SupportPort` over `POST /v1/support`,
  account deletion over `DELETE /v1/user`, and the failure-to-copy mapping.
- `appStore/` — the App Store id and the product, write-review and manage-subscription URLs.
- `review/` — the App Store rating policy binding and the only `expo-store-review` import.
