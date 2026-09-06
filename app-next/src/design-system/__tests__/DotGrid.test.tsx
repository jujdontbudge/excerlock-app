import { render, screen } from '@testing-library/react-native';
import { DotGrid } from '../DotGrid';
test.each([0, 40, 100])('dot grid makes %s emphasized dots understandable', async (emphasized) => {
  await render(<DotGrid total={100} emphasized={emphasized} label="Days reclaimed" />);
  expect(screen.getByLabelText('Days reclaimed').props.accessibilityValue.text).toBe(`${emphasized} of 100`);
});
