SELECT count() AS n
FROM events
WHERE timestamp >= toDateTime('2026-09-06 20:21:05') AND timestamp < toDateTime('2026-10-21 20:21:05')
AND (properties.environment IN ('Production','Sandbox') OR (properties.environment='prod' AND properties.$is_emulator=false))
AND (event IN ('paywall_viewed','purchase_started','purchase_failed','paywall_error','restore_started','restore_failed','sign_in_failed','onboarding_offer_exposed','trial_started','trial_converted','trial_renewal_cancelled','subscription_started','subscription_renewed','subscription_renewal_cancelled','subscription_expired','subscription_renewal_reactivated')
 OR (event='$screen' AND properties.$screen_name IN ('onboarding','paywall','sign_in','home','settings','settings_legal'))
 OR event='onboarding_screen_viewed')
