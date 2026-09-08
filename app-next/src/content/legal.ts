// In-app summaries of the published legal documents. The full text lives at
// https://excerlock.com/privacy and https://excerlock.com/terms (effective 8 September 2026); keep the
// two in step when either changes. `placeholder` stays false: the release guardrail test fails a
// production build while it is true.
export const LEGAL_PLACEHOLDER = false;
export const LEGAL_URLS = {
  privacy: 'https://excerlock.com/privacy',
  terms: 'https://excerlock.com/terms',
  support: 'https://excerlock.com/support.html',
} as const;
export const legalCopy = {
  placeholder: LEGAL_PLACEHOLDER,
  privacy: {
    title: 'Privacy Policy',
    sections: [
      {
        title: 'Who is responsible',
        body: 'ExcerLock is made and operated by Johan Sardar, an individual developer in the United States. Privacy questions and requests: privacy@excerlock.com. The full policy, effective 8 September 2026, is at excerlock.com/privacy.',
      },
      {
        title: 'The short version',
        body: 'ExcerLock does not know which apps you locked. Apple hands the app an opaque token, not a list of names, and that token never leaves your iPhone. ExcerLock does not track you across other apps and websites, shows no ads, and sells nothing to anybody.',
      },
      {
        title: 'What never leaves your iPhone',
        body: 'Your locked-app selection, your saved gyms and location, your gym searches, the camera frames used for the treadmill check, your name, and detailed health samples such as heart rate and cadence are processed on the device and never sent to us.',
      },
      {
        title: 'What we collect, and why',
        body: 'Your email address, to sign you in with a code and to answer support. The progress number for each condition and your conditions themselves, as a backup a new phone can restore. Daily minutes spent in shielded apps as a single number. One pseudonymous account id shared by sign-in, our server, your subscription and analytics. Subscription status from the App Store. Crash reports that are never linked to you.',
      },
      {
        title: 'Analytics, and how to turn them off',
        body: 'Screen views and a fixed list of in-app events go to PostHog so we can see where the app is confusing. Every event is checked against an allowlist, so free text cannot get through. Settings > Share usage analytics turns all of it off. Health data never reaches analytics, crash reporting or subscription services.',
      },
      {
        title: 'Who processes data for us',
        body: 'Supabase for sign-in, Resend for delivering sign-in codes and support mail, Adapty for subscriptions, PostHog for analytics, Sentry for crash reports, Apple for payments and Maps search, and our own server in the United States.',
      },
      {
        title: 'Deleting your account and your data',
        body: 'Settings > Delete account removes your account and every server-side record of it. You can also write to privacy@excerlock.com. Deleting your account does not cancel a subscription; cancel that with Apple.',
      },
      {
        title: 'Children',
        body: 'ExcerLock is not directed at children under 13 and we do not knowingly collect their data. Use it to limit your own screen time, never to monitor another person.',
      },
    ],
  },
  terms: {
    title: 'Terms of Use',
    sections: [
      {
        title: 'Your licence to use ExcerLock',
        body: 'ExcerLock is made and operated by Johan Sardar. You get a personal, non-transferable licence to use the app on Apple devices you own or control, under Apple’s App Store terms. The full terms, effective 8 September 2026, are at excerlock.com/terms.',
      },
      {
        title: 'Subscription, billing and cancellation',
        body: 'ExcerLock Premium is an auto-renewing subscription, annual or monthly, billed by Apple to your Apple Account. It renews at the same price unless you cancel at least 24 hours before the end of the current period. Cancel in iOS Settings > your name > Subscriptions. Deleting the app or your ExcerLock account does not cancel billing.',
      },
      {
        title: 'Free trial',
        body: 'The annual plan may include a free trial. It converts into a paid annual subscription when it ends unless you cancel at least 24 hours before the trial’s last day. The app sends a reminder, but cancelling in time is your responsibility.',
      },
      {
        title: 'Refunds',
        body: 'Purchases and refunds are handled by Apple under Apple’s policies at reportaproblem.apple.com. If something in the app went wrong, tell us at support@excerlock.com.',
      },
      {
        title: 'If your subscription lapses',
        body: 'ExcerLock lifts every shield it applied. A lapsed subscription never leaves your apps locked, and settings, support and account deletion stay reachable.',
      },
      {
        title: 'Acceptable use',
        body: 'Use ExcerLock to limit your own screen time and earn it back with your own activity. Do not use it to monitor or restrict another person, falsify activity or location, interfere with our servers or the app’s enforcement, or share a subscription.',
      },
      {
        title: 'What the app can and cannot do',
        body: 'Shields use Apple’s Screen Time framework and detection uses the iPhone’s sensors, Apple Health and, if enabled, location. Detection is best-effort and depends on iOS. ExcerLock is a commitment device, not a security product. Do not rely on it where being blocked from an app could cause harm.',
      },
      {
        title: 'Not medical advice',
        body: 'ExcerLock is a habit tool, not a medical device. Nothing in it is medical, psychological or fitness advice. Talk to a qualified professional before starting or changing an exercise programme, and stop if you feel unwell.',
      },
      {
        title: 'Liability and governing law',
        body: 'The app is provided as is. To the extent the law allows, our liability is limited to what you paid for the app in the twelve months before a claim. These terms are governed by the laws of New Jersey, United States. Contact: support@excerlock.com.',
      },
    ],
  },
} as const;
