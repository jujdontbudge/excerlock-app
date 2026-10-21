SELECT event, count() AS events, uniqExact(distinct_id) AS ids,
 min(timestamp) AS first_seen, max(timestamp) AS last_seen
FROM events
WHERE timestamp >= toDateTime('2026-09-06 20:21:05') AND timestamp < toDateTime('2026-10-21 20:21:05')
AND properties.environment='prod' AND properties.$is_emulator=false
AND (event LIKE 'purchase_%' OR event LIKE 'restore_%' OR event LIKE 'subscription_%' OR event LIKE 'trial_%'
 OR event LIKE 'sign_in%' OR event LIKE 'sign_up%' OR event IN ('paywall_error','paywall_viewed','onboarding_offer_exposed','$application_installed','$application_updated','$application_opened'))
GROUP BY event
ORDER BY event
LIMIT 500
