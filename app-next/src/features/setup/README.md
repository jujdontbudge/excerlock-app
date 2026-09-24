# Setup

After the paywall, `SetupRoute` (`/setup/X1`) runs `SetupFlow`: sign-in (skippable unless the `signInRequired` flag says otherwise), then one screen per thing the enabled conditions still need — apps to lock (Screen Time), Motion & Fitness for walking, location (Always for Unlock while walking, While Using for a gym) and a saved gym. `setupNeeds` in `src/domain/setupNeeds.ts` decides the list; `PermissionGuide` draws the exact iOS alert where it will appear, with an orange arrow at the choice to tap. Home's `SetupReminder` card and the builder/Conditions toggle open the same flow at `/permissions/<step>`, without sign-in. See ADR 0043.

Sign-in is optional and lives on the welcome screen and in Settings (`app/sign-in.tsx`). `SignInScreen` owns email/options state; `EmailCodeScreen` renders the code, resend and error controls. Phase 1's fake verification code is `123456`.
