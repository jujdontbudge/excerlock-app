import { SvgXml } from 'react-native-svg';
import { tokens } from '../design-system/tokens';
import { iconXml } from './art';
import { paths, IconName } from './paths';
export type { IconName } from './paths';
export const iconNames = Object.keys(paths) as IconName[];
export function Icon({
  name,
  size = tokens.layout.icon,
  tint = tokens.text.primary,
  label,
  variant = 'color',
}: {
  name: IconName;
  size?: number;
  tint?: string;
  label?: string;
  variant?: 'color' | 'utility';
}) {
  return (
    <SvgXml
      xml={iconXml(name, variant === 'utility')}
      color={tint}
      width={size}
      height={size}
      accessible={!!label}
      accessibilityLabel={label}
      accessibilityRole="image"
    />
  );
}
