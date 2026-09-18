/**
 * The AnalyticsKit type law, proved by the compiler.
 *
 * Every `@ts-expect-error` below guards a call that MUST NOT compile: if the
 * kit's types ever loosen enough to accept it, the unused directive itself
 * becomes an error. Every un-annotated call MUST compile: if the types ever
 * tighten wrongly, it errors. So "this file has zero diagnostics" is the whole
 * law, in both directions — which is exactly what `__tests__/typeLaw.test.ts`
 * asserts by running `tsc` over this file with the app's own compiler options.
 *
 * Keep every guarded call on ONE line: `@ts-expect-error` only covers the line
 * that follows it, and object-literal errors are reported at the property.
 */
import { createAnalyticsKit, createFlowTracker } from "..";

const kit = createAnalyticsKit();
const flow = createFlowTracker(kit);
/** Stands in for any name a call site might build at runtime rather than import. */
const computedName: string = "shields_applied";

// ---- Legal: client-owned events with their exact registry payloads ----------
kit.track("shields_applied", { app_state: "background", source: "manual", cause: "relock" });
kit.track("shields_lifted", { app_state: "background", source: "manual", reason: "walking" });
kit.track("condition_created");
kit.track("earn_claimed");
kit.track("paywall_viewed", { placement: "onboarding", has_trial: true });
kit.track("purchase_started", { placement: "in_app", plan_id: "excerlock_annual" });
kit.track("milestone_unlocked");
kit.track("notification_toggled", { type: "weekly_recap", is_enabled: false });
// Events that declare no properties take no payload — or an explicitly empty one.
kit.track("sick_day_override_used");
kit.track("diagnostics_shared", {});

// ---- Legal: the FLOW helpers, over screens the registry locked -------------
flow.trackOnboardingScreen("value-prop");
flow.trackOnboardingAnswer("confession", 360);
flow.trackOnboardingAnswer("pick-apps", true);
flow.trackOnboardingAnswer("mirror", "seen");

// ---- Illegal: events this side does not own (D4/D5/D9) ---------------------
// @ts-expect-error server-owned: the support composer's POST emits it, not the app.
kit.track("support_request_submitted", { category: "bug" });
// @ts-expect-error server-owned: VendorSync holds the OAuth exchange.
kit.track("vendor_connected", { vendor: "strava" });
// @ts-expect-error adapty-owned: the native integration is the only emitter (D9).
kit.track("trial_started", {});
// @ts-expect-error adapty-owned.
kit.track("subscription_renewed", { product_id: "excerlock_annual" });

// ---- Illegal: names outside the registry (D3) ------------------------------
// @ts-expect-error not a registered event name.
kit.track("shields_applied_v2", { cause: "full_lock" });
// @ts-expect-error a runtime string is not a registry literal — no call site may compute a name.
kit.track(computedName, { cause: "full_lock" });
// @ts-expect-error PostHog-reserved namespace.
kit.track("$screen", {});

// ---- Illegal: wrong payloads ----------------------------------------------
// @ts-expect-error shield cause is device-local Screen Time state.
kit.track("shields_applied", { cause: "full_lock" });
// @ts-expect-error earn details and workout metrics stay on-device.
kit.track("earn_claimed", { kind: "state", signal: "sleep", source: "healthkit", payout: "rest_of_day", minutes_earned: 45 });
// @ts-expect-error wrong primitive type.
kit.track("paywall_viewed", { placement: "onboarding", has_trial: "yes" });
// @ts-expect-error excess property — payloads are exactly the declared shape (D12).
kit.track("shields_applied", { cause: "full_lock", note: "felt like it" });
// @ts-expect-error an empty-props event carries nothing — the override's reason stays on-device (D12).
kit.track("sick_day_override_used", { reason: "flu" });

// ---- Illegal: FLOW helpers off the locked rail -----------------------------
// @ts-expect-error not a FLOW_SCREENS member.
flow.trackOnboardingScreen("checkout");
// @ts-expect-error not a FLOW_SCREENS member.
flow.trackOnboardingAnswer("checkout", 1);
// @ts-expect-error answers are ids/enums/numbers/booleans, never structured data (D12).
flow.trackOnboardingAnswer("confession", { hours: 6 });
