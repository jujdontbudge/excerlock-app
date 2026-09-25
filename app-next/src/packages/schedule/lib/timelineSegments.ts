import { Schedule } from '../../model/types';
export function timelineSegments(window: Schedule['window']) {
  if (window.kind === 'allDay') return [{ left: 0, width: 100 }];
  const { startMinute: start, endMinute: end } = window;
  const segment = (from: number, to: number) => ({ left: (from / 1440) * 100, width: ((to - from) / 1440) * 100 });
  return end > start ? [segment(start, end)] : [segment(0, end), segment(start, 1440)];
}
