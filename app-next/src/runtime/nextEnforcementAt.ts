export type NextEnforcementInput = {
  now: string;
  intervalBoundaries?: readonly string[];
  relockAt?: string | null;
  leaseUntil?: string | null;
  holdsUntil?: string | null;
};

export function nextEnforcementAt(input: NextEnforcementInput): string | null {
  const now = Date.parse(input.now);
  const next = [
    ...(input.intervalBoundaries ?? []),
    input.relockAt,
    input.leaseUntil,
    input.holdsUntil,
  ]
    .filter((deadline): deadline is string => Boolean(deadline) && Date.parse(deadline!) > now)
    .sort((left, right) => Date.parse(left) - Date.parse(right))[0];
  return next ?? null;
}
