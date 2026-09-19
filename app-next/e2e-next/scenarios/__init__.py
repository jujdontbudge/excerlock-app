"""e2e-next scenario registry (plan §7.2, SIM lane only).

Order matters for `--all`: E2E-F1 mints the existing-user fixture, E1/V1 consume
it while the simulator's keychain still carries the minted session, and
fresh-install scenarios (N1, S1) reset that keychain; E2E-F2 tears the fixture
down at the end.
"""
from __future__ import annotations

from .a3_email_signin import A3EmailSignIn
from .a4_delete_account import A4DeleteAccount
from .e1_existing_user_home import E1ExistingUserHome
from .e2_ota_stub import E2OtaReceiptStub
from .f1_fixture_mint import F1FixtureMint
from .f2_fixture_teardown import F2FixtureTeardown
from .h1_home_report import H1HomeReport
from .n1_onboarding_paywall import N1OnboardingPaywall
from .n4_offline_fallback import N4OfflineFallbackPaywall, N4WarmProfileOfflineFallback
from .r1_incident_report import R1IncidentReport
from .s1_startup_budget import S1StartupBudget
from .v1_screen_sweep import V1ScreenSweep

SCENARIO_CLASSES = (
    N1OnboardingPaywall,
    F1FixtureMint,
    E1ExistingUserHome,
    V1ScreenSweep,
    R1IncidentReport,
    H1HomeReport,
    S1StartupBudget,
    A3EmailSignIn,
    A4DeleteAccount,
    E2OtaReceiptStub,
    N4OfflineFallbackPaywall,
    N4WarmProfileOfflineFallback,
    F2FixtureTeardown,
)

SCENARIOS = {scenario.id: scenario for scenario in SCENARIO_CLASSES}

__all__ = ['SCENARIOS', 'SCENARIO_CLASSES']
