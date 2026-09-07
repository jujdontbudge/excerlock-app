import { render, screen } from '@testing-library/react-native';
import { Icon, iconNames } from '../Icon';
import { iconXml } from '../art';
test('every semantic icon renders with its accessible identity', async () => {
  expect(iconNames).toEqual(
    expect.arrayContaining([
      'walking',
      'gym',
      'running',
      'biking',
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
    await render(<Icon name={name} label={name} tint="red" />);
    expect(screen.getByLabelText(name)).toBeTruthy();
  }
});
test('utilities accept render-time tint while activity art preserves its palette', () => {
  expect(iconXml('chevron')).toContain('currentColor');
  expect(iconXml('walking')).not.toContain('currentColor');
});
test('onboarding can tint every icon while preserving its original geometry', () => {
  for (const name of iconNames) {
    const xml = iconXml(name, false, true);
    expect(xml).not.toMatch(/(?:fill|stroke)="#[0-9a-f]+"/i);
    expect(xml).toContain('currentColor');
  }
});
