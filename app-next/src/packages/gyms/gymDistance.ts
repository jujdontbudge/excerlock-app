export function gymDistance(metres: number, units: 'km' | 'mi'): string {
  const distance = Math.max(0, metres);
  if (units === 'mi') {
    const feet = distance / 0.3048;
    return feet < 5280 ? `${Math.round(feet / 10) * 10} ft` : `${(distance / 1609.344).toFixed(1)} mi`;
  }
  return distance < 1000 ? `${Math.round(distance / 10) * 10} m` : `${(distance / 1000).toFixed(1)} km`;
}
