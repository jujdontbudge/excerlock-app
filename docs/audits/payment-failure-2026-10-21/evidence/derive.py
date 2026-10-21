#!/usr/bin/env python3
"""Recompute incident measures from the sanitized, read-only evidence exports."""

import collections
import csv
import json
import pathlib


ROOT = pathlib.Path(__file__).resolve().parent


def read_csv(name):
    with (ROOT / name).open(newline="") as source:
        return list(csv.DictReader(source))


def candidate_rows(rows):
    return [row for row in rows if row["cohort_status"] == "production_candidate"]


def signal(rows, predicate):
    matches = [row for row in rows if predicate(row)]
    return {"ids": len({row["anon_id"] for row in matches}), "events": len(matches)}


def main():
    cohort = read_csv("cohort.csv")
    journeys = read_csv("journeys.csv")
    financial = candidate_rows(read_csv("financial-events.csv"))
    vendor = candidate_rows(read_csv("vendor-events.csv"))
    candidates = candidate_rows(cohort)
    candidate_ids = {row["anon_id"] for row in candidates}
    per_id = candidate_rows(read_csv("funnel-by-id.csv"))
    candidate_journeys = candidate_rows(journeys)
    profiles = json.loads((ROOT / "adapty-profiles.json").read_text())
    assert len(cohort) == len({row["anon_id"] for row in cohort}) == 35
    assert len(candidates) == len(candidate_ids) == 17
    assert {row["anon_id"] for row in per_id} == candidate_ids
    assert len(journeys) == 1205
    assert len(candidate_journeys) == 510
    assert sum(row["cohort_status"] == "possibly_internal_review" for row in cohort) == 13
    assert sum(row["cohort_status"] == "possibly_internal_review" for row in journeys) == 209
    assert len(profiles) == 35 and all(row["status"] == 200 for row in profiles)

    measures = {
        "window_utc": json.loads((ROOT / "provenance.json").read_text()),
        "cohort_status_counts": dict(collections.Counter(row["cohort_status"] for row in cohort)),
    }
    for name, event in [
        ("loaded_paywall", "paywall_viewed"),
        ("explicit_purchase_start", "purchase_started"),
        ("restore_start", "restore_started"),
        ("restore_failure", "restore_failed"),
        ("sign_in_failure", "sign_in_failed"),
    ]:
        measures[name] = signal(financial, lambda row: row["event"] == event)
    measures["paywall_screen"] = signal(
        candidate_journeys,
        lambda row: row["event"] == "$screen" and row["screen"] == "paywall",
    )
    measures["checkout_user_lower_bound"] = signal(
        financial,
        lambda row: row["event"] == "purchase_started"
        or (row["event"] == "paywall_error" and row["operation"] == "purchase"),
    )
    measures["cancelled_purchase"] = signal(
        financial,
        lambda row: row["event"] == "purchase_failed" and row["reason_class"] == "cancelled",
    )
    measures["purchase_error"] = signal(
        financial,
        lambda row: row["event"] == "paywall_error" and row["operation"] == "purchase",
    )
    measures["apple_failure"] = signal(
        financial, lambda row: row["event"] == "sign_in_failed" and row["provider"] == "apple"
    )
    measures["apple_unknown_failure"] = signal(
        financial,
        lambda row: row["event"] == "sign_in_failed"
        and row["failure_code"] == "APPLE_SIGNIN_FAILED_ERR_REQUEST_UNKNOWN",
    )
    for event in [
        "trial_started", "trial_converted", "trial_renewal_cancelled", "trial_expired",
        "subscription_started", "subscription_renewed", "subscription_refunded",
        "subscription_renewal_cancelled",
    ]:
        measures[event] = signal(
            vendor, lambda row: row["event"] == event and row["env"] == "Production"
        )
    for key, column in [
        ("paywall_screen", "paywall_surface_views"),
        ("loaded_paywall", "loaded_paywall_views"),
        ("explicit_purchase_start", "purchase_starts"),
        ("restore_start", "restore_starts"),
        ("restore_failure", "restore_failures"),
        ("apple_failure", "apple_failures"),
        ("apple_unknown_failure", "apple_unknown_failures"),
    ]:
        assert measures[key] == {
            "ids": sum(int(row[column]) > 0 for row in per_id),
            "events": sum(int(row[column]) for row in per_id),
        }, key

    paywall_ids = {
        row["anon_id"] for row in candidate_journeys
        if row["event"] == "$screen" and row["screen"] == "paywall"
    }
    loaded_ids = {row["anon_id"] for row in financial if row["event"] == "paywall_viewed"}
    measures["paywall_screen_without_loaded_event_ids"] = sorted(paywall_ids - loaded_ids)
    same_session_reset, any_welcome_return, same_session_onboarding_return = set(), set(), set()
    for aid in sorted(paywall_ids):
        rows = [row for row in candidate_journeys if row["anon_id"] == aid]
        paywalls = [row for row in rows if row["event"] == "$screen" and row["screen"] == "paywall"]
        for row in rows:
            if row["event"] != "$screen" or row["screen"] != "onboarding":
                continue
            earlier = [paywall for paywall in paywalls if paywall["timestamp"] < row["timestamp"]]
            if not earlier:
                continue
            if row["step"] == "O01":
                any_welcome_return.add(aid)
            if any(paywall["session_index"] == row["session_index"] for paywall in earlier):
                same_session_onboarding_return.add(aid)
                if row["step"] == "O01":
                    same_session_reset.add(aid)
    measures["same_session_welcome_reset_ids"] = sorted(same_session_reset)
    measures["same_session_onboarding_return_ids"] = sorted(same_session_onboarding_return)
    measures["only_later_session_welcome_return_ids"] = sorted(any_welcome_return - same_session_reset)
    measures["paywall_placement_arm"] = {}
    for row in financial:
        if row["event"] != "paywall_viewed":
            continue
        key = f'{row["placement"]}:{row["offer_arm"] or "unrecorded"}'
        measures["paywall_placement_arm"].setdefault(key, []).append(row)
    measures["paywall_placement_arm"] = {
        key: {"ids": len({row["anon_id"] for row in rows}), "events": len(rows)}
        for key, rows in measures["paywall_placement_arm"].items()
    }
    measures["sentry_financial_auth_event_counts"] = dict(collections.Counter(
        row["title"] for row in read_csv("sentry-financial-auth-errors.csv")
    ))
    destination = ROOT / "derived-metrics.json"
    destination.write_text(json.dumps(measures, indent=2) + "\n")
    print(json.dumps({
        "production_candidate_ids": len(candidates),
        "paywall_ids": measures["paywall_screen"]["ids"],
        "checkout_user_lower_bound": measures["checkout_user_lower_bound"]["ids"],
        "candidate_timeline_rows": len(candidate_journeys),
        "derived_metrics": str(destination.relative_to(ROOT.parent)),
    }, indent=2))


if __name__ == "__main__":
    main()
