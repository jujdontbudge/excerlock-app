import { Icon, IconName, IconTone } from '../icons/Icon';
import { illustrationTokens as art } from './illustrationTokens';
export function Pictogram({
  name,
  size = 'hero',
  tone,
  variant = 'color',
  label,
}: {
  name: IconName;
  size?: keyof typeof art.pictogram;
  tone?: IconTone;
  variant?: 'color' | 'utility';
  label?: string;
}) {
  return <Icon name={name} size={art.pictogram[size]} tone={tone} variant={variant} label={label} />;
}
