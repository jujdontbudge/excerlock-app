export const researchRatingCopy = {
  researchTitle: 'ExcerLock is built on research to ',
  emphasis: 'HACK',
  researchEnd: ' your brain',
  universities: [
    { name: 'University of Oxford', logo: require('../../../assets/onboarding/oxford.png'), aspectRatio: 900 / 263, share: 0.52 },
    { name: 'Harvard University', logo: require('../../../assets/onboarding/harvard.png'), aspectRatio: 900 / 226, share: 0.54 },
    { name: 'University of Cambridge', logo: require('../../../assets/onboarding/cambridge.png'), aspectRatio: 900 / 181, share: 0.5 },
  ],
  principles: ['Behavioral psychology', 'Exercise science', 'No shame, no punishment'],
  ratingTitle: 'Give us a rating',
  rating: '4.7',
  ratingCount: '50K+ ExcerLock users',
  communityTitle: 'ExcerLock was made for\npeople like you',
  communityCount: '50,000+ ExcerLock users',
  reviews: [
    { name: 'Maya', photo: require('../../../assets/onboarding/reviews/maya.jpg'), text: 'I used to skip exercise all the time. Now I actually look forward to getting my steps in before opening my apps.' },
    { name: 'Daniel', photo: require('../../../assets/onboarding/reviews/daniel.jpg'), text: 'Walking every day finally stuck. I’ve lost so much weight just by being more consistent.' },
    { name: 'Sophie', photo: require('../../../assets/onboarding/reviews/sophie.jpg'), text: 'Less scrolling, more lifting. I’ve gained so much muscle since I started showing up regularly.' },
    { name: 'Arjun', photo: require('../../../assets/onboarding/reviews/arjun.jpg'), text: 'Finally consistent in the gym. Having to go before my apps unlock is the little push I needed.' },
    { name: 'Elena', photo: require('../../../assets/onboarding/reviews/elena.jpg'), text: 'Best app for procrastinators. I used to scroll instead of doing anything. Now I get moving first.' },
    { name: 'Ben', photo: require('../../../assets/onboarding/reviews/ben.jpg'), text: 'I doubled my steps without even thinking about it. My lunchtime walk is just part of the day now.' },
  ],
} as const;
