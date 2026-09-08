import { activities } from './activities';
import { onboardingLabels } from './onboarding';

export const welcomeCopy = {
  progressPagination: 'Introduction, page 2 of 3',
  progressValue: '-3h 12m',
  progressDescription: 'Illustrative screen-time reduction of 3 hours and 12 minutes',
  illustrative: onboardingLabels.illustrative,
  back: 'Back',
  controlPagination: 'Introduction, page 3 of 3',
  activities: activities.map(({ title }) => title),
  schedule: 'Block from 12 PM to 8 PM\nuntil you arrive\nat the gym',
  scheduleLabel: 'Block from 12 PM to 8 PM until you arrive at the gym',
  existing: 'Already have an account? ',
  signIn: 'Sign in',
  legalTitle: 'Legal',
  legalLead: 'By continuing, you agree to our ',
  privacy: 'Privacy Policy',
  and: ' and ',
  terms: 'Terms of Use',
  pagination: 'Introduction, page 1 of 3',
  apps: { instagram: 'Instagram', youtube: 'YouTube', whatsapp: 'WhatsApp', tiktok: 'TikTok' },
} as const;
