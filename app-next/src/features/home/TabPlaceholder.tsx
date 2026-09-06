import { ScreenShell, EmptyState } from '../../design-system';
import { TabId, tabItems } from '../../content/tabs';
import { homeCopy as c } from '../../content/home';
export function TabPlaceholder({ tab }: { tab: TabId }) {
  const item = tabItems.find((t) => t.id === tab)!;
  return (
    <ScreenShell safeBottom={false}>
      <EmptyState icon={item.icon} title={item.title} body={c.placeholder} />
    </ScreenShell>
  );
}
