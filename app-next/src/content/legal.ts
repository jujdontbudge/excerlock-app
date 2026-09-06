// Phase 1 placeholder legal text. Replace with counsel-approved documents before release.
export const legalCopy = {
  privacy: {
    title: 'Privacy Policy',
    sections: [
      {
        title: 'Your information',
        body: 'ExcerLock uses your activity information to evaluate the conditions you create. Your selected apps are represented by private selection handles.',
      },
      {
        title: 'Your choices',
        body: 'You control access to movement, workout, location and camera information in device settings. Sign-in is optional.',
      },
      {
        title: 'Your device',
        body: 'Your conditions and progress remain on this device when you sign out or delete your account.',
      },
    ],
  },
  terms: {
    title: 'Terms of Use',
    sections: [
      {
        title: 'Using ExcerLock',
        body: 'Choose exercise goals that are appropriate for you. You remain responsible for your device settings and activity choices.',
      },
      {
        title: 'Membership',
        body: 'Subscription billing and cancellation are managed through your App Store account. Deleting an ExcerLock account does not cancel a subscription.',
      },
      {
        title: 'Your plan',
        body: 'App availability follows your enabled conditions and their schedules. Device settings and granted access affect what ExcerLock can do.',
      },
    ],
  },
} as const;
