const months: Record<string, number> = { year: 12, month: 1, week: 12 / 52, day: 12 / 365 };

export function monthlyPrice(
  price: { amount?: number; currencyCode?: string } | undefined,
  period: { unit?: string; numberOfUnits?: number } | undefined,
  locale: string,
): string | null {
  const span = period?.unit ? months[period.unit] * (period.numberOfUnits || 1) : 0;
  if (!price?.amount || !price.currencyCode || !span) return null;
  try {
    return new Intl.NumberFormat(locale || undefined, { style: 'currency', currency: price.currencyCode })
      .format(Math.round((price.amount / span) * 100) / 100);
  } catch {
    return null;
  }
}
