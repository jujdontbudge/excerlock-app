"""Gym baseline branch of the same live onboarding verifier."""
from .n1_onboarding_paywall import N1OnboardingPaywall


class N1GymOnboarding(N1OnboardingPaywall):
    id = 'E2E-N1G'
    title = 'Fresh install → gym baseline questions → personalized plan → live paywall'
    activity = 'Gym'
