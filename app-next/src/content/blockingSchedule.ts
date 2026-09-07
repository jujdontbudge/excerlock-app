export const blockingScheduleCopy = {
  dayStart: '12 AM',
  dayEnd: '11:59 PM',
  range: (start: string, end: string) => `Block from ${start} to ${end}`,
  allDay: 'Block all day',
  until: (goal: string) => `until you ${goal}`,
  arrival: 'until you arrive\nat the gym',
  walking: 'unlock while you walk',
  nextDay: ' · next day',
};
