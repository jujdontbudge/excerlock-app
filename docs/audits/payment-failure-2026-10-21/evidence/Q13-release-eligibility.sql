SELECT distinct_id AS anon_id, properties.$app_version AS app_version,
 properties.$app_build AS build, properties.runtime_version AS runtime,
 properties.$os_version AS os_version, properties.$device_name AS device_model,
 min(timestamp) AS first_seen,max(timestamp) AS last_seen,count() AS events
FROM events
WHERE timestamp >= toDateTime('2026-09-06 20:21:05') AND timestamp < toDateTime('2026-10-21 20:21:05')
AND properties.environment='prod' AND properties.$is_emulator=false
GROUP BY anon_id,app_version,build,runtime,os_version,device_model
ORDER BY anon_id,first_seen
LIMIT 500
