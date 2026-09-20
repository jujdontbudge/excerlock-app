export type ScheduleHandle = 'start' | 'end';
const DAY = 1440;
const wrap = (minute: number) => (minute + DAY) % DAY;

export function dialPoint(minute: number, center: number, radius: number) {
  const angle = minute / DAY * Math.PI * 2 - Math.PI / 2;
  return { x: center + Math.cos(angle) * radius, y: center + Math.sin(angle) * radius };
}

/** Clockwise from midnight, snapped to 15-minute increments. */
export function dialMinute(x: number, y: number, center: number): number {
  const angle = Math.atan2(y - center, x - center) + Math.PI / 2;
  return wrap(Math.round(angle / (Math.PI * 2) * DAY / 15) * 15);
}

export function nearestHandle(minute: number, start: number, end: number): ScheduleHandle {
  const distance = (a: number, b: number) => Math.min(wrap(a - b), wrap(b - a));
  return distance(minute, start) <= distance(minute, end) ? 'start' : 'end';
}

export function boundedMinute(which: ScheduleHandle, minute: number, start: number, end: number): number {
  const snapped = wrap(Math.round(minute / 15) * 15);
  return which === 'start' && snapped === end ? wrap(end - 15)
    : which === 'end' && snapped === start ? wrap(start + 15) : snapped;
}
