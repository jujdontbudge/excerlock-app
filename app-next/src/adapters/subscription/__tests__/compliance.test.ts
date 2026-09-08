import { assertCompliantFallback, paywallComplianceViolations } from '../paywallCompliance';

const compliant = {
  screens: [
    { type: 'text', value: 'ExcerLock Premium' },
    { type: 'product', value: '$59.99 / year after your 7-day free trial' },
    { type: 'text', value: 'Subscriptions renew automatically unless canceled.' },
    { type: 'link', label: 'Terms of Use', url: 'https://excerlock.com/terms' },
    { type: 'link', label: 'Privacy Policy', url: 'https://excerlock.com/privacy' },
  ],
};

test('a paywall carrying terms, privacy, price and renewal has no violations', () => {
  expect(paywallComplianceViolations(compliant)).toEqual([]);
});

test('a paywall built from a price tag rather than a literal price still shows a price', () => {
  const tagged = {
    text: 'Then ${price} per year',
    renewal: 'Renews yearly unless canceled',
    links: compliant.screens.slice(3),
  };
  expect(paywallComplianceViolations(tagged)).toEqual([]);
});

test('a paywall with no legal links fails on both documents', () => {
  const { screens } = compliant;
  expect(paywallComplianceViolations({ screens: screens.slice(0, 3) })).toEqual(['terms', 'privacy']);
});

test('legal words with no link to tap do not count', () => {
  expect(
    paywallComplianceViolations({
      text: 'Terms of Use and Privacy Policy apply. $59.99/year, renews unless canceled.',
    }),
  ).toEqual(['terms', 'privacy']);
});

test('a paywall with no price and no renewal disclosure names both', () => {
  expect(paywallComplianceViolations({ screens: compliant.screens.slice(3) })).toEqual(['price', 'renewal']);
});

test('a string payload is scanned as JSON, which is how Adapty ships the builder view', () => {
  expect(paywallComplianceViolations(JSON.stringify(compliant))).toEqual([]);
});

test('an empty or unreadable payload cannot be proven compliant', () => {
  expect(paywallComplianceViolations(undefined)).toEqual(['terms', 'privacy', 'price', 'renewal']);
  expect(paywallComplianceViolations('not json')).toEqual(['terms', 'privacy', 'price', 'renewal']);
});

test('a bundled fallback that would fail App Review is refused at registration', () => {
  expect(() => assertCompliantFallback({ screens: compliant.screens.slice(0, 3) })).toThrow(/terms, privacy/);
  expect(() => assertCompliantFallback(compliant)).not.toThrow();
});
