import { render, screen, fireEvent } from '@testing-library/react-native';
import { Slider } from '../Slider';
test('the slider supports accessible increments without exceeding its range', async () => {
  const change = jest.fn();
  await render(<Slider label="Hours per day" value={3} min={0} max={12} step={0.5} onChange={change} />);
  const slider = screen.getByRole('adjustable');
  expect(slider.props.accessibilityValue.now).toBe(3);
  await fireEvent(slider, 'accessibilityAction', {
    nativeEvent: { actionName: 'increment' },
  });
  expect(change).toHaveBeenCalledWith(3.5);
});

test('touching the track sets a value immediately, without requiring a drag', async () => {
  const { getByGestureTestId, fireGestureHandler } = require('react-native-gesture-handler/jest-utils');
  const { State } = require('react-native-gesture-handler');
  const { act } = require('@testing-library/react-native');
  const change = jest.fn();
  await render(<Slider label="Track touch" value={3} min={0} max={12} step={0.5} onChange={change} />);
  await fireEvent(screen.getByRole('adjustable'), 'layout', {
    nativeEvent: { layout: { width: 300, height: 44, x: 0, y: 0 } },
  });
  await act(async () => {
    fireGestureHandler(getByGestureTestId('Track touch'), [
      { state: State.BEGAN, x: 150, y: 22 },
      { state: State.END, x: 150, y: 22 },
    ]);
  });
  expect(change).toHaveBeenCalledWith(6);
});
