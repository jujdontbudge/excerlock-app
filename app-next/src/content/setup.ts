export const setupCopy = {
  X1: 'Let ExcerLock block your apps',
  screenTimeBody: 'Your choices stay private. You stay in control.',
  screenTimeFacts: [
    'Blocks the apps you choose',
    'Cannot see what you do in them',
    'Change your choices any time in Settings',
  ],
  screenTimeAllow: 'Allow Screen Time',
  screenTimeDenied: 'Screen Time is off. ExcerLock cannot block your apps yet.',
  settings: 'Open Settings',
  settingsNote: 'You can change this permission in Settings. Your current choice stays as it is for now.',
  anyway: 'Continue anyway',
  X2: 'Which apps should wait?',
  appsBody: 'Choose the apps and categories you want to unlock with movement.',
  chooseApps: 'Choose apps',
  skip: 'Skip for now',
  motionTitle: 'Let ExcerLock count your steps',
  motionBody: 'Use your daily steps to make progress on your walking goals.',
  motionAllow: 'Allow Motion & Fitness',
  motionDenied: 'Step progress cannot update while Motion & Fitness is off.',
  gymTitle: 'Find your gym',
  gymBody: 'Save a gym so showing up can count toward your plan.',
  chooseGym: 'Choose a gym',
  locationTitle: 'Recognize your gym visits',
  locationBody: 'Location helps ExcerLock recognize when you are at your saved gym.',
  locationAllow: 'Allow location while using the app',
  locationDenied: 'Automatic gym visits cannot count while Location is off.',
  autoDetect: 'Auto-detect arrivals',
  autoDetectBody: 'Allow location access all the time to recognize arrivals when ExcerLock is closed.',
  X4: 'Save your progress',
  authBody: 'Keep your plan connected to you.',
  apple: 'Continue with Apple',
  google: 'Continue with Google',
  email: 'Continue with email',
  emailLabel: 'Email address',
  sendCode: 'Send code',
  emailTitle: 'Sign in with email',
  codeTitle: 'Check your email',
  codeBody: 'Enter the six-digit code to save your progress.',
  codeLabel: 'Verification code',
  verify: 'Verify code',
  resend: 'Resend code',
  resent: 'A new code is ready.',
  authError: 'Could not sign in. Please try again.',
  codeError: 'That code did not work. Please try again.',
  emailError: 'Enter a valid email address.',
  cancelled: 'Sign-in was canceled. You can try again or skip for now.',
  backToOptions: 'Back to sign-in options',
  continue: 'Continue',
  granted: 'Access is on',
  /**
   * After the paywall, and whenever a condition needs something new: one screen per grant, each
   * with the iOS alert drawn where it will appear and the one choice to tap (ADR 0043).
   */
  notNow: 'Not now',
  flow: {
    apps: {
      title: 'Choose apps to lock',
      action: 'Continue',
      blocked: 'Screen Time is off for ExcerLock. Turn it on in Settings.',
    },
    motion: {
      title: 'Count your steps',
      action: 'Continue',
      blocked: 'Motion & Fitness is off for ExcerLock. Turn it on in Settings.',
    },
    walkLocation: {
      title: 'Unlock apps as you walk',
      action: 'Continue',
      blocked: 'Set Location to Always in Settings so a walk opens your apps while ExcerLock is closed.',
    },
    gymLocation: {
      title: 'Know when you are at the gym',
      action: 'Continue',
      blocked: 'Location is off for ExcerLock. Turn it on in Settings.',
    },
    gym: {
      title: 'Pick your gym',
      body: 'Only visits to your gym count.',
      action: 'Choose gym',
      blocked: '',
    },
  },
  /** The line under each permission title: the one choice to tap on the iPhone alert below it. */
  tap: (button: string) => `Tap “${button}”`,
  /**
   * The iOS alerts, word for word, so the copy drawn on each screen is covered exactly by the real
   * one (ADR 0043). Messages are the purpose strings in config/native.ts and the motion plugin; a
   * test keeps them equal. `tap` is the button that turns the permission on.
   */
  alerts: {
    screenTime: {
      title: '“ExcerLock” Would Like to Access Screen Time',
      message:
        'Providing “ExcerLock” access to Screen Time may allow it to see your activity data, restrict content, and limit the usage of apps and websites.',
      buttons: ['Continue', 'Don’t Allow'],
      tap: 0,
      deny: 1,
    },
    motion: {
      title: '“ExcerLock” Would Like to Access Your Motion & Fitness Activity',
      message: "ExcerLock uses Motion & Fitness data to verify that you're walking during Walk & Scroll sessions.",
      buttons: ['Don’t Allow', 'OK'],
      tap: 1,
      deny: 0,
    },
    location: {
      title: 'Allow “ExcerLock” to use your location?',
      message: 'Allow ExcerLock to check whether you are at a saved gym.',
      buttons: ['Allow Once', 'Allow While Using App', 'Don’t Allow'],
      tap: 1,
      deny: 2,
    },
    alwaysLocation: {
      title: 'Allow “ExcerLock” to use your location?',
      message:
        'Allow ExcerLock to keep walk detection and gym auto-detect running while the app is closed, so exercise opens your apps without opening ExcerLock.',
      buttons: ['Allow Once', 'Allow While Using App', 'Don’t Allow'],
      tap: 1,
      deny: 2,
    },
    /** iOS offers the step from While Using to Always once, in this alert. */
    alwaysUpgrade: {
      title: 'Allow “ExcerLock” to also use your location even when you are not using the app?',
      message:
        'Allow ExcerLock to keep walk detection and gym auto-detect running while the app is closed, so exercise opens your apps without opening ExcerLock.',
      buttons: ['Keep Only While Using', 'Change to Always Allow'],
      tap: 1,
      deny: 0,
    },
    camera: {
      title: '“ExcerLock” Would Like to Access the Camera',
      message: 'Allow ExcerLock to use the front camera to verify treadmill walking while the app is open.',
      buttons: ['Don’t Allow', 'OK'],
      tap: 1,
      deny: 0,
    },
    notifications: {
      title: '“ExcerLock” Would Like to Send You Notifications',
      message: 'Notifications may include alerts, sounds, and icon badges. These can be configured in Settings.',
      buttons: ['Don’t Allow', 'Allow'],
      tap: 1,
      deny: 0,
    },
  },
} as const;
