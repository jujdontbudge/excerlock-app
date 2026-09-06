import { tokens } from '../tokens';
import { contrast } from '../contrast';
test('the functional orange and supporting text meet WCAG AA on the canvas', () => {
  expect(contrast(tokens.brand.primary, tokens.surface.canvas)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(tokens.text.secondary, tokens.surface.canvas)).toBeGreaterThanOrEqual(4.5);
  expect(contrast('#000000', '#FFFFFF')).toBe(21);
  expect(contrast('#FFFFFF', '#FFFFFF')).toBe(1);
  expect(tokens).toMatchSnapshot();
});
