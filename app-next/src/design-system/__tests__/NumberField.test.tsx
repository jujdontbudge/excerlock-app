import { render, screen, fireEvent, userEvent } from '@testing-library/react-native';
import { NumberField } from '../NumberField';
test('numeric editing and unit selection keep the typed value independent of the unit', async () => {
  const change = jest.fn(),
    unit = jest.fn();
  await render(
    <NumberField label="Distance" value="2" onChange={change} unit="km" units={['km', 'mi']} onUnitChange={unit} />,
  );
  await fireEvent.changeText(screen.getByLabelText('Distance'), '3.5');
  expect(change).toHaveBeenCalledWith('3.5');
  await userEvent.press(screen.getByRole('button', { name: 'Unit: km' }));
  await userEvent.press(screen.getByRole('radio', { name: 'mi' }));
  expect(unit).toHaveBeenCalledWith('mi');
  expect(change).toHaveBeenCalledTimes(1);
});
test('VoiceOver can read and adjust a numeric goal in its correct increment', async () => {
  const change = jest.fn();
  await render(<NumberField label="Daily step goal" value="5000" unit="steps" onChange={change} step={500} min={500} max={30000} />);
  const field = screen.getByRole('adjustable', {name:'Daily step goal'});
  expect(field.props.accessibilityValue).toEqual({now:5000, min:500, max:30000, text:'5000 steps'});
  await fireEvent(field, 'accessibilityAction', {nativeEvent:{actionName:'increment'}});
  expect(change).toHaveBeenCalledWith('5500');
});
