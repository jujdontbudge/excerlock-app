# Adapty subscription mirror

This module accepts already-authenticated Adapty webhook envelopes and mirrors
only access state for active accounts. `profile_event_id` is the delivery key;
the server deliberately does not retain webhook bodies, profile identifiers,
transaction identifiers, price, currency, attribution, IP addresses, or user
attributes.

The mirror compares Adapty's business `event_datetime`, rather than delivery
arrival time, so a delayed older lifecycle event cannot overwrite a newer
access decision. The delivery key independently handles exact retries.

Every event carries Adapty's `event_properties.environment` ("Sandbox" or
"Production"), stored lowercase on both the ledger and the mirror. The field
is required: an event that cannot be attributed to a store fails validation
rather than defaulting into the revenue-bearing side. Sandbox events flow
through the same pipeline, but state is independently keyed by `(user_id,
environment)` and production authorization reads only `environment =
'production'`. A newer sandbox event cannot overwrite or grant production.
Equal business timestamps resolve deterministically by delivery key. Both Adapty endpoints (production and sandbox)
point at the same URL with the same Authorization value; the payload's own
stamp is the separator, so a misconfigured dashboard cannot mislabel events.

The user row is locked before recording a delivery. Account deletion uses the
same row lock through its upsert, so the two transactions serialize:

- if the webhook wins, deletion removes the state mirror and nulls the event's
  user link;
- if deletion wins, the webhook records only its opaque delivery key and event
  type, and cannot recreate the user or subscription state.

The delivery ledger survives account deletion so Adapty retries, renewals, and
refunds remain idempotent. Apple billing is not cancelled by either the webhook
or account deletion.

The receiver fails closed with `503` until `ADAPTY_WEBHOOK_SECRET` is set to
the exact Authorization value configured in Adapty. This secret is independent
from `ADAPTY_SECRET_KEY`, which authorizes server-side profile erasure.

Authenticated `POST /v1/subscription/resync` derives the customer id only from
the verified token and accepts no identity, environment, or access body. The
documented profile API does not bind premium aggregates to a store environment,
so resync is read-only and reports unavailable; aggregate access cannot grant.
Null/missing webhook customer ids are acknowledged without creating a user.

Only the documented `access_level_updated` event for
`access_level_id=premium` writes authorization state. Transaction lifecycle
events expose profile-wide access and are acknowledged without assigning that
aggregate to a production or sandbox partition.

Shared-backend configuration accepts `production,sandbox` via
`ADAPTY_WEBHOOK_ACCEPTED_STORE_ENVIRONMENTS`; production authorization is
fixed to `SUBSCRIPTION_AUTHORIZATION_STORE_ENVIRONMENT=production` and parsing
rejects sandbox authorization for this deployment.
