SELECT event,properties.environment AS env,count() AS events,uniqExact(distinct_id) AS ids,
 sum(toFloat(properties.price_usd)) AS gross_usd,min(timestamp) AS first_seen,max(timestamp) AS last_seen
FROM events
WHERE timestamp >= toDateTime('2026-09-06 20:21:05') AND timestamp < toDateTime('2026-10-21 20:21:05')
AND properties.environment IN ('Production','Sandbox')
GROUP BY event,env
ORDER BY env,event
LIMIT 500
