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
through the same pipeline — a TestFlight tester's access mirror works exactly
like a customer's — but anything that counts revenue or customers must filter
`environment = 'production'`. Both Adapty endpoints (production and sandbox)
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
