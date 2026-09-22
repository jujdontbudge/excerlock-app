import { act, render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { ScheduleDial } from '../ScheduleDial';
import { dialPoint } from '../scheduleDialMath';
import { minuteLabel } from '../../domain/scheduleLabel';
import { tokens as t } from '../tokens';

// The dial draws in a 360-unit viewBox; touches arrive in points at the rendered size.
const VIEWBOX = 360;
const size = Math.min(Dimensions.get('window').width - t.layout.page * 2, 420);
const touch = (minute: number, size: number, timestamp: number) => {
  const p = dialPoint(minute, VIEWBOX / 2, 154);
  const x = (p.x * size) / VIEWBOX;
  const y = (p.y * size) / VIEWBOX;
  const bank = {
    touchActive: true,
    startPageX: x,
    startPageY: y,
    startTimeStamp: 0,
    currentPageX: x,
    currentPageY: y,
    currentTimeStamp: timestamp,
    previousPageX: x,
    previousPageY: y,
    previousTimeStamp: timestamp,
  };
  return {
    nativeEvent: { locationX: x, locationY: y, pageX: x, pageY: y, touches: [{}], changedTouches: [{}], timestamp },
    touchHistory: {
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: timestamp,
      touchBank: [bank],
    },
  };
};

function Harness(props: Partial<Parameters<typeof ScheduleDial>[0]>) {
  return (
    <ScheduleDial
      startMinute={540}
      endMinute={1260}
      allDay={false}
      onChange={jest.fn()}
      onChoose={jest.fn()}
      {...props}
    />
  );
}

test('dragging the start handle previews the new time and commits it on release', async () => {
  const onChange = jest.fn();
  await render(<Harness onChange={onChange} />);
  const dial = screen.getByTestId('schedule-dial');
  expect(dial.props.onStartShouldSetResponder(touch(540, size, 1))).toBe(true);
  await act(() => dial.props.onResponderGrant(touch(540, size, 2)));
  await act(() => dial.props.onResponderMove(touch(600, size, 3)));
  expect(screen.getByText(minuteLabel(600))).toBeTruthy();
  expect(onChange).not.toHaveBeenCalled();
  await act(() => dial.props.onResponderRelease(touch(600, size, 4)));
  expect(onChange).toHaveBeenCalledWith('start', 600);
});

test('an all-day window reads 24 hr at rest and the live span while a handle is dragged', async () => {
  await render(<Harness startMinute={540} endMinute={540} allDay />);
  expect(screen.getByText('24 hr')).toBeTruthy();
  const dial = screen.getByTestId('schedule-dial');
  await act(() => dial.props.onResponderGrant(touch(540, size, 1)));
  await act(() => dial.props.onResponderMove(touch(600, size, 2)));
  expect(screen.getByText('23 hr')).toBeTruthy();
  await act(() => dial.props.onResponderRelease(touch(600, size, 3)));
});
