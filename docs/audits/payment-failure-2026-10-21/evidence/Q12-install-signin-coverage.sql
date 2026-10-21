SELECT distinct_id AS anon_id, event, count() AS events,
 min(timestamp) AS first_seen, max(timestamp) AS last_seen
FROM events
WHERE timestamp >= toDateTime('2026-09-06 20:21:05') AND timestamp < toDateTime('2026-10-21 20:21:05')
AND properties.environment='prod' AND properties.$is_emulator=false
AND (lower(event) LIKE '%install%' OR lower(event) LIKE '%application%'
 OR lower(event) LIKE '%sign_in%' OR lower(event) LIKE '%sign_up%' OR lower(event) LIKE '%signin%' OR lower(event) LIKE '%signup%')
GROUP BY anon_id,event
ORDER BY event,anon_id
LIMIT 500
