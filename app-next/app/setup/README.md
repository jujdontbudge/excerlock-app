# Setup routes

After the paywall an entitled user lands on `setup/X1`, which runs `src/features/setup/SetupRoute`: sign-in, then one screen for each permission the enabled conditions need (ADR 0043). Finishing it, or tapping Not now on each screen, marks setup complete and opens Home. Older installs saved on X3–X5 resume at the same flow. The same permission screens open without sign-in at `app/permissions.tsx`, from Home's reminder card and after a condition that needs something new is saved or turned on.
