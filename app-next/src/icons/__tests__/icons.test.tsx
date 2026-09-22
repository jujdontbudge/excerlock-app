import { render, screen } from '@testing-library/react-native';
import { Icon, iconNames } from '../Icon';
import { iconXml } from '../art';
import { tokens as t } from '../../design-system/tokens';
test('every semantic icon renders with its accessible identity', async () => {
  expect(iconNames).toEqual(
    expect.arrayContaining([
      'walking',
      'gym',
      'bell',
      'ruler',
      'flame',
      'lock',
      'lock-open',
      'map-pin',
      'shield',
      'heart',
      'gear',
      'chart',
      'list',
      'house',
    ]),
  );
  for (const name of iconNames) {
    await render(<Icon name={name} label={name} tone="onAccent" />);
    expect(screen.getByLabelText(name)).toBeTruthy();
  }
});
test('every use resolves to the same tintable canonical geometry', () => {
  expect(iconXml('chevron')).toContain('currentColor');
  for (const name of iconNames) {
    expect(iconXml(name)).toContain('currentColor');
    expect(iconXml(name)).toEqual(iconXml(name, true, true));
  }
});
test('onboarding can tint every icon while preserving its original geometry', () => {
  for (const name of iconNames) {
    const xml = iconXml(name, false, true);
    expect(xml).not.toMatch(/(?:fill|stroke)="#[0-9a-f]+"/i);
    expect(xml).toContain('currentColor');
  }
});
test('one tint rule: orange by default, white on orange fills, grey when inactive, green for success', async () => {
  const tones = [
    [undefined, t.brand.primary],
    ['onAccent', t.text.onAccent],
    ['muted', t.border.mutedStroke],
    ['success', t.state.success],
  ] as const;
  for (const [tone, color] of tones) {
    await render(<Icon name="bell" label="Bell" tone={tone} />);
    expect(screen.getByLabelText('Bell').props.color).toBe(color);
  }
});
