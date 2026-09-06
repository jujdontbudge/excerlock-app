import { render, screen } from '@testing-library/react-native';
import { LoopDiagram } from '../LoopDiagram';
test.each([0, 1, 2])('loop phase %s exposes its three steps', async (phase) => {
  await render(<LoopDiagram phase={phase} labels={['Trigger', 'Scroll', 'Repeat']} />);
  expect(screen.getByText('Trigger')).toBeTruthy();
  expect(screen.getByText('Repeat')).toBeTruthy();
});
