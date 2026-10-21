SELECT properties.$app_build AS build, properties.runtime_version AS runtime, properties.update_id AS update_id,
 min(timestamp) AS first_seen,max(timestamp) AS last_seen,
 uniqExact(distinct_id) AS ids,countIf(event='paywall_viewed') AS paywalls,
 countIf(event='purchase_started') AS purchase_starts,countIf(event='purchase_failed') AS purchase_failures,
 countIf(event='restore_started') AS restores,countIf(event='paywall_error') AS errors
FROM events
WHERE timestamp >= toDateTime('2026-09-06 20:21:05') AND timestamp < toDateTime('2026-10-21 20:21:05')
AND properties.environment='prod' AND properties.$is_emulator=false
GROUP BY build,runtime,update_id
ORDER BY first_seen
LIMIT 500
