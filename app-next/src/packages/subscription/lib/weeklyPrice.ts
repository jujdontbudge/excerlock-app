const weeks: Record<string, number> = { year: 52, month: 52 / 12, week: 1, day: 1 / 7 };

type Price = { amount?: number; currencyCode?: string } | undefined;
type Period = { unit?: string; numberOfUnits?: number } | undefined;

function pricePer(price: Price, period: Period, locale: string, per: number): string | null {
  const span = period?.unit ? weeks[period.unit] * (period.numberOfUnits || 1) : 0;
  if (!price?.amount || !price.currencyCode || !span) return null;
  try {
    return new Intl.NumberFormat(locale || undefined, { style: 'currency', currency: price.currencyCode })
      .format(Math.round((price.amount / (span / per)) * 100) / 100);
  } catch {
    return null;
  }
}

export function weeklyPrice(price: Price, period: Period, locale: string): string | null {
  return pricePer(price, period, locale, weeks.week);
}

export function monthlyPrice(price: Price, period: Period, locale: string): string | null {
  return pricePer(price, period, locale, weeks.month);
}
