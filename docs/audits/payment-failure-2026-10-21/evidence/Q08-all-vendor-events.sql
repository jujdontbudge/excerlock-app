SELECT timestamp,uuid AS event_id,distinct_id AS anon_id,event,
 properties.environment AS env,properties.vendor_product_id AS vendor_product_id,
 properties.price_usd AS price_usd,properties.paywall_name AS paywall_name,
 properties.variation_id AS variation_id,properties.purchase_date AS purchase_date,
 properties.original_purchase_date AS original_purchase_date,properties.subscription_expires_at AS subscription_expires_at
FROM events
WHERE timestamp >= toDateTime('2026-09-06 20:21:05') AND timestamp < toDateTime('2026-10-21 20:21:05')
AND properties.environment IN ('Production','Sandbox')
ORDER BY timestamp,anon_id,event,event_id
LIMIT 500
