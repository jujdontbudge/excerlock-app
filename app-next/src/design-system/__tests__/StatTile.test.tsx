import { render, screen } from '@testing-library/react-native';
import { StatTile } from '../StatTile';
test.each(['3,200', '—'])('stat tile labels the %s metric', async (value) => {
  await render(<StatTile label="Steps" value={value} support="Today" />);
  expect(screen.getByText(value)).toBeTruthy();
  expect(screen.getByText('Steps')).toBeTruthy();
});
