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
