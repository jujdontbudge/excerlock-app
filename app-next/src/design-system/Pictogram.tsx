import { Icon, IconName } from '../icons/Icon';
import { illustrationTokens as art } from './illustrationTokens';
/** An icon glyph drawn as artwork, above the UI icon scale: a card's picture or a screen's hero. */
export function Pictogram({
  name,
  size = 'hero',
  tint,
  variant = 'color',
  label,
}: {
  name: IconName;
  size?: keyof typeof art.pictogram;
  tint?: string;
  variant?: 'color' | 'utility';
  label?: string;
}) {
  return <Icon name={name} size={art.pictogram[size]} tint={tint} variant={variant} label={label} />;
}
