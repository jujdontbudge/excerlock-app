export function ringGeometry(width: number) {
  const stroke = width * 0.045,
    inset = stroke / 2,
    radius = width * 0.13 - inset;
  const side = width - stroke,
    straight = side - 2 * radius,
    mid = width / 2,
    end = width - inset;
  return {
    stroke,
    length: 4 * straight + 2 * Math.PI * radius,
    path: `M ${mid} ${inset} H ${end - radius} A ${radius} ${radius} 0 0 1 ${end} ${inset + radius} V ${end - radius} A ${radius} ${radius} 0 0 1 ${end - radius} ${end} H ${inset + radius} A ${radius} ${radius} 0 0 1 ${inset} ${end - radius} V ${inset + radius} A ${radius} ${radius} 0 0 1 ${inset + radius} ${inset} Z`,
  };
}
export const distanceLabel = (metres: number) =>
  metres < 1000 ? `${Math.round(metres / 10) * 10} m` : `${(metres / 1000).toFixed(1)} km`;
