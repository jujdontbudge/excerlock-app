SELECT timestamp, distinct_id AS anon_id, uuid AS event_id,
 properties.$app_build AS build, properties.runtime_version AS runtime, properties.update_id AS update_id,
 $session_id AS session_id
FROM events
WHERE timestamp >= toDateTime('2026-09-06 20:21:05') AND timestamp < toDateTime('2026-10-21 20:21:05')
AND properties.environment='prod' AND properties.$is_emulator=false
AND event='$screen' AND properties.$screen_name='setup' AND properties.step='account'
ORDER BY timestamp,anon_id,event_id
LIMIT 500
