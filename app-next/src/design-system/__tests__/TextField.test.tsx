import { render, screen, fireEvent } from '@testing-library/react-native';
import { TextField } from '../TextField';
test('a labelled text field accepts edits and exposes validation errors', async () => {
  const change = jest.fn();
  await render(<TextField label="First name" value="" onChangeText={change} error="Enter your name" />);
  await fireEvent.changeText(screen.getByLabelText('First name'), 'Alex');
  expect(change).toHaveBeenCalledWith('Alex');
  expect(screen.getByRole('alert')).toHaveTextContent('Enter your name');
});
