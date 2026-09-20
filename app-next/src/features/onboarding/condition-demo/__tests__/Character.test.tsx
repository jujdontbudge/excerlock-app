import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Character } from '../Character';
import { DemoState, Scenario } from '../model';

test('every decoded frame overrides intrinsic asset dimensions to fit the fixed sprite canvas', async () => {
  const clock = { value: { time: 0, walkTime: 0, distance: 0 } as DemoState };
  const scenario = { kind: 'walk-state', place: 'outside' } as Scenario;
  const view = await render(<Character clock={clock as never} scenario={scenario} reduced={false} onLoad={() => {}} />);
  const images = view.queryAllByTestId(/^condition-demo-frame-\d$/);
  expect(images).toHaveLength(8);
  for (const image of images) {
    const style = StyleSheet.flatten(image.props.style);
    expect(style.width).toBe('100%');
    expect(style.height).toBe('100%');
    expect(image.props.resizeMode).toBe('contain');
  }
});
