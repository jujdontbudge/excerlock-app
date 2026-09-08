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
kit.track("shields_applied");
kit.track("shields_lifted");
kit.track("condition_created", { activity: "walking", mode: "state" });
kit.track("rule_met", { activity: "gym", mode: "event", day: 3, window_bucket: "first_hour" });
kit.track("paywall_viewed", { placement: "onboarding", has_trial: true });
kit.track("purchase_started", { placement: "in_app", plan_id: "excerlock_annual" });
kit.track("apps_unlocked_rest_of_day", { activity: "running" });
kit.track("notification_opened", { type: "trial_reminder" });
// Events that declare no properties take no payload — or an explicitly empty one.
kit.track("data_export_requested");
kit.track("diagnostics_shared", {});

// ---- Legal: the FLOW helpers, over the retired rail this app still renders --
flow.trackOnboardingScreen("value-prop");
flow.trackOnboardingAnswer("confession", 360);
flow.trackOnboardingAnswer("pick-apps", true);
flow.trackOnboardingAnswer("mirror", "seen");

// ---- Illegal: events this side does not own (D4/D5/D9) ---------------------
// @ts-expect-error server-owned: the support composer's POST emits it, not the app.
kit.track("support_request_submitted", { category: "bug" });
// @ts-expect-error server-owned: the account-deletion route is the authoritative emitter.
kit.track("account_deleted", {});
// @ts-expect-error adapty-owned: the native integration is the only emitter (D9).
kit.track("trial_started", {});
// @ts-expect-error adapty-owned.
kit.track("subscription_renewed", { product_id: "excerlock_annual" });

// ---- Illegal: names outside the registry (D3) ------------------------------
// @ts-expect-error not a registered event name.
kit.track("shields_applied_v2", { cause: "full_lock" });
// @ts-expect-error cut from the registry by B16 (badges and share cards are not in v1).
kit.track("milestone_unlocked");
// @ts-expect-error cut from the registry by B30 (there is no per-type notification toggle).
kit.track("notification_toggled", { type: "weekly_recap", is_enabled: false });
// @ts-expect-error a runtime string is not a registry literal — no call site may compute a name.
kit.track(computedName, { cause: "full_lock" });
// @ts-expect-error PostHog-reserved namespace.
kit.track("$screen", {});

// ---- Illegal: wrong payloads ----------------------------------------------
// @ts-expect-error shield cause is device-local Screen Time state.
kit.track("shields_applied", { cause: "full_lock" });
// @ts-expect-error the goal, the progress and the workout metric stay on-device (D12).
kit.track("apps_unlocked_rest_of_day", { activity: "running", minutes_earned: 45, source: "healthkit" });
// @ts-expect-error wrong primitive type.
kit.track("paywall_viewed", { placement: "onboarding", has_trial: "yes" });
// @ts-expect-error excess property — payloads are exactly the declared shape (D12).
kit.track("shields_applied", { cause: "full_lock", note: "felt like it" });
// @ts-expect-error an empty-props event carries nothing — the export's scope stays on-device (D12).
kit.track("data_export_requested", { scope: "everything" });

// ---- Illegal: FLOW helpers off the locked rail -----------------------------
// @ts-expect-error not a LEGACY_FLOW_SCREENS member.
flow.trackOnboardingScreen("checkout");
// @ts-expect-error not a LEGACY_FLOW_SCREENS member.
flow.trackOnboardingAnswer("checkout", 1);
// @ts-expect-error answers are ids/enums/numbers/booleans, never structured data (D12).
flow.trackOnboardingAnswer("confession", { hours: 6 });
