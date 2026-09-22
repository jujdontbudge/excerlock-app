import { SvgXml } from 'react-native-svg';
import { tokens } from '../design-system/tokens';
import { iconXml } from './art';
import { paths, IconName } from './paths';
import { useSetupPresentation } from '../design-system/SetupPresentation';
export type { IconName } from './paths';
export const iconNames = Object.keys(paths) as IconName[];
export function Icon({
  name,
  size = tokens.icon.lg,
  tint,
  label,
  variant = 'color',
}: {
  name: IconName;
  size?: number;
  tint?: string;
  label?: string;
  variant?: 'color' | 'utility';
}) {
  const onboarding = useSetupPresentation();
  return (
    <SvgXml
      xml={iconXml(name, variant === 'utility', onboarding)}
      color={tint ?? (onboarding ? tokens.brand.primary : tokens.text.primary)}
      width={size}
      height={size}
      accessible={!!label}
      accessibilityLabel={label}
      accessibilityRole="image"
    />
  );
}
