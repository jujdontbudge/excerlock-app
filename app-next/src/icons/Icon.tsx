import { SvgXml } from 'react-native-svg';
import { tokens } from '../design-system/tokens';
import { iconXml } from './art';
import { paths, IconName } from './paths';
export type { IconName } from './paths';
export const iconNames = Object.keys(paths) as IconName[];
/**
 * The one tint rule. An icon is orange on light surfaces (`accent`, the default),
 * white on an orange fill (`onAccent`), grey when inactive or unavailable (`muted`),
 * and green or red only to mean success or a destructive action.
 */
export type IconTone = 'accent' | 'onAccent' | 'muted' | 'success' | 'danger';
const toneColor: Record<IconTone, string> = {
  accent: tokens.brand.primary,
  onAccent: tokens.text.onAccent,
  muted: tokens.border.mutedStroke,
  success: tokens.state.success,
  danger: tokens.state.error,
};
export function Icon({
  name,
  size = tokens.icon.lg,
  tone = 'accent',
  label,
  variant = 'color',
}: {
  name: IconName;
  size?: number;
  tone?: IconTone;
  label?: string;
  variant?: 'color' | 'utility';
}) {
  return (
    <SvgXml
      xml={iconXml(name, variant === 'utility')}
      color={toneColor[tone]}
      width={size}
      height={size}
      accessible={!!label}
      accessibilityLabel={label}
      accessibilityRole="image"
    />
  );
}
