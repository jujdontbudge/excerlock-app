export const tabItems = [
  { id: 'home', title: 'Home', icon: 'house' },
  { id: 'conditions', title: 'Conditions', icon: 'list' },
  { id: 'analytics', title: 'Analytics', icon: 'chart' },
  { id: 'settings', title: 'Settings', icon: 'gear' },
] as const;
export type TabId = (typeof tabItems)[number]['id'];
