SELECT distinct_id AS anon_id,
 countIf(event='$screen' AND properties.$screen_name='paywall') AS paywall_surface_views,
 countIf(event='paywall_viewed') AS loaded_paywall_views,
 countIf(event='purchase_started') AS purchase_starts,
 countIf(event='purchase_failed') AS purchase_failures,
 countIf(event='paywall_error' AND properties.operation='purchase') AS purchase_errors,
 countIf(event='restore_started') AS restore_starts,
 countIf(event='restore_failed') AS restore_failures,
 countIf(event='sign_in_failed' AND properties.provider='apple') AS apple_failures,
 countIf(event='sign_in_failed' AND properties.provider='apple' AND properties.failure_code='APPLE_SIGNIN_FAILED_ERR_REQUEST_UNKNOWN') AS apple_unknown_failures
FROM events
WHERE timestamp >= toDateTime('2026-09-06 20:21:05') AND timestamp < toDateTime('2026-10-21 20:21:05')
AND properties.environment='prod' AND properties.$is_emulator=false
GROUP BY anon_id
ORDER BY anon_id
LIMIT 500
