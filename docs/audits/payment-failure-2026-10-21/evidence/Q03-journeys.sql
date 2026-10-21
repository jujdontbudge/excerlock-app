SELECT timestamp, distinct_id AS anon_id, event, properties.environment AS env,
 properties.$screen_name AS screen, properties.step AS step,
 if(event='onboarding_screen_viewed',properties.screen,NULL) AS onboarding_page,
 properties.$app_build AS build, properties.runtime_version AS runtime,
 properties.update_id AS update_id, properties.placement AS placement,
 properties.offer_arm AS offer_arm, properties.offer_source AS offer_source,
 properties.has_trial AS has_trial, properties.plan_id AS plan_id,
 properties.reason_class AS reason_class, properties.failure_code AS failure_code,
 properties.operation AS operation, properties.provider AS provider,
 properties.surface AS surface, properties.vendor_product_id AS vendor_product_id,
 properties.price_usd AS price_usd, properties.paywall_name AS paywall_name,
 properties.variation_id AS variation_id, $session_id AS session_id
FROM events
WHERE timestamp >= toDateTime('2026-09-06 20:21:05') AND timestamp < toDateTime('2026-10-21 20:21:05')
AND (properties.environment IN ('Production','Sandbox') OR (properties.environment='prod' AND properties.$is_emulator=false))
AND (event IN ('paywall_viewed','purchase_started','purchase_failed','paywall_error','restore_started','restore_failed','sign_in_failed','onboarding_offer_exposed','trial_started','trial_converted','trial_renewal_cancelled','subscription_started','subscription_renewed','subscription_renewal_cancelled','subscription_expired','subscription_renewal_reactivated')
 OR (event='$screen' AND properties.$screen_name IN ('onboarding','paywall','sign_in','home','settings','settings_legal'))
 OR event='onboarding_screen_viewed')
ORDER BY timestamp,anon_id,event
LIMIT 10000
