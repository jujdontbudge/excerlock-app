"""e2e-next scenario registry (plan §7.2, SIM lane only)."""
from __future__ import annotations

from .a3_email_signin import A3EmailSignIn
from .a4_delete_account import A4DeleteAccount
from .e1_existing_user_home import E1ExistingUserHome
from .e2_ota_stub import E2OtaReceiptStub
from .n1_onboarding_paywall import N1OnboardingPaywall
from .s1_startup_budget import S1StartupBudget
from .v1_screen_sweep import V1ScreenSweep

SCENARIO_CLASSES = (
    N1OnboardingPaywall,
    E1ExistingUserHome,
    V1ScreenSweep,
    S1StartupBudget,
    A3EmailSignIn,
    A4DeleteAccount,
    E2OtaReceiptStub,
)

SCENARIOS = {scenario.id: scenario for scenario in SCENARIO_CLASSES}

__all__ = ['SCENARIOS', 'SCENARIO_CLASSES']
