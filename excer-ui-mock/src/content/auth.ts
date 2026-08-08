import type { AccountStatus } from "./types";

export const authFixture: {
  accountStatus: AccountStatus;
  email: string;
  maskedEmail: string;
  method: null | "apple" | "email";
  disclosure: string;
} = {
  accountStatus: "postPurchase",
  email: "jordan@example.com",
  maskedEmail: "j•••••@example.com",
  method: null,
  disclosure: "Prototype preview — no Apple or Clerk account is contacted or created.",
};

export const signupCopy = {
  eyebrow: "Premium preview ready",
  title: "Save your setup",
  body: "Keep the plan and setup together in one sample profile. This prototype creates nothing outside the app.",
  statusLabel: "Demo account — nothing is sent",
  primary: "Continue with Apple",
  divider: "or",
  secondary: "Continue with email",
  existingAccount: "Already have an account? Sign in",
  footer: "By continuing, you acknowledge the local Terms of Use and Privacy Policy previews.",
  simulatedNative: true,
  apple: {
    account: "j•••••@example.com",
    primary: "Continue",
    secondary: "Cancel",
    processing: "Preparing demo profile…",
  },
  email: {
    title: "Use your email",
    body: "Enter the address for the sample profile. No email will be sent.",
    fieldLabel: "Email",
    placeholder: "name@example.com",
    guidedValue: "jordan@example.com",
    primary: "Continue with email",
    disabledReason: "Enter a complete email address.",
    secondary: "Back",
  },
  success: {
    title: "Your demo profile is ready.",
    body: "Jordan’s sample profile now holds the local setup. No account was created and nothing was uploaded.",
    primary: "Start with Home",
  },
  failure: {
    title: "Couldn’t finish the signup preview.",
    cause: "The local auth fixture is set to unavailable.",
    recovery: "Your subscribed state and setup are still here.",
    actions: ["Try again", "Back"],
  },
} as const;

export const signInCopy = {
  title: "Sign back in",
  body: "Reconnect Jordan’s sample profile to this local setup. No account service is contacted.",
  statusLabel: "Demo account — nothing is sent",
  primary: "Continue with Apple",
  secondary: "Continue with email",
  footerLink: "Need a demo profile? Create one",
  disclosure: "Prototype preview — no Apple or Clerk account is contacted.",
  simulatedNative: true,
  success: {
    title: "You’re back in this demo.",
    body: "Jordan’s sample profile is connected to the local setup. Nothing was downloaded or changed outside the prototype.",
    action: "Done",
  },
  failure: {
    title: "Couldn’t finish the sign-in preview.",
    recovery: "The local setup is still available. Try the sample sign-in again or go back.",
    actions: ["Try again", "Back"],
  },
} as const;
