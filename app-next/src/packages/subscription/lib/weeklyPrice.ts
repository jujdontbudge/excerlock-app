const weeks: Record<string, number> = { year: 52, month: 52 / 12, week: 1, day: 1 / 7 };

export function weeklyPrice(
  price: { amount?: number; currencyCode?: string } | undefined,
  period: { unit?: string; numberOfUnits?: number } | undefined,
  locale: string,
): string | null {
  const span = period?.unit ? weeks[period.unit] * (period.numberOfUnits || 1) : 0;
  if (!price?.amount || !price.currencyCode || !span) return null;
  try {
    return new Intl.NumberFormat(locale || undefined, { style: 'currency', currency: price.currencyCode })
      .format(Math.round((price.amount / span) * 100) / 100);
  } catch {
    return null;
  }
}
