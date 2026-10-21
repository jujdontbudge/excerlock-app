SELECT distinct_id AS anon_id, toString(person_id) AS person_id,
 minIf(timestamp,properties.environment='prod') AS first_prod,
 maxIf(timestamp,properties.environment='prod') AS last_prod,
 groupUniqArrayIf(properties.$device_name,properties.environment='prod') AS devices,
 groupUniqArrayIf(properties.$app_build,properties.environment='prod') AS builds,
 groupUniqArrayIf(properties.$os_version,properties.environment='prod') AS os_versions,
 countIf(properties.environment='prod') AS prod_events,
 countIf(properties.environment IN ('dev','preview')) AS nonprod_events,
 countIf(properties.$is_emulator=true) AS emulator_events,
 countIf(event='paywall_viewed' AND properties.environment='prod') AS paywalls,
 countIf(event='purchase_started' AND properties.environment='prod') AS purchase_starts,
 countIf(event='purchase_failed' AND properties.environment='prod') AS purchase_failures,
 countIf(event='paywall_error' AND properties.environment='prod') AS paywall_errors,
 countIf(event='restore_started' AND properties.environment='prod') AS restore_starts,
 countIf(event='restore_failed' AND properties.environment='prod') AS restore_failures,
 countIf(event='sign_in_failed' AND properties.environment='prod') AS signin_failures,
 countIf(event='$screen' AND properties.$screen_name='home' AND properties.environment='prod') AS home_views,
 countIf(properties.environment='Production') AS production_vendor_events,
 countIf(properties.environment='Sandbox') AS sandbox_vendor_events
FROM events
WHERE timestamp >= toDateTime('2026-09-06 20:21:05') AND timestamp < toDateTime('2026-10-21 20:21:05')
AND distinct_id IN (
 SELECT distinct_id FROM events
 WHERE timestamp >= toDateTime('2026-09-06 20:21:05') AND timestamp < toDateTime('2026-10-21 20:21:05')
 AND properties.environment='prod' AND properties.$is_emulator=false
)
GROUP BY anon_id,person_id
ORDER BY first_prod
LIMIT 1000
