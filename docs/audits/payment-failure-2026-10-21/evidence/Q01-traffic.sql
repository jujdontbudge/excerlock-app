SELECT properties.environment AS env, properties.$is_emulator AS emulator,
       properties.$device_name AS device, properties.$app_build AS build,
       count() AS events, uniqExact(distinct_id) AS ids,
       countIf(event='paywall_viewed') AS paywall_views,
       uniqExactIf(distinct_id,event='paywall_viewed') AS paywall_users,
       min(timestamp) AS first_seen, max(timestamp) AS last_seen
FROM events
WHERE timestamp >= toDateTime('2026-09-06 20:21:05') AND timestamp < toDateTime('2026-10-21 20:21:05')
GROUP BY env,emulator,device,build
ORDER BY events DESC
LIMIT 1000
