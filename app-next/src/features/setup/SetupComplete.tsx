import { Heading, Checklist } from '../../design-system';
import { LivingIcon } from '../../motion/LivingIcon';
import { setupCopy as c } from '../../content/setup';
import { permissionsStore as usePermissionsStore } from '../../state/permissionsStore';
import { rulesStore as useRulesStore } from '../../state/rulesStore';
import { sessionStore as useSessionStore } from '../../state/sessionStore';
import { branchPermission } from '../../onboarding/setupFlow';
import { Activity } from '../../domain/types';
export function SetupComplete({ activity }: { activity: Activity }) {
  const permissions = usePermissionsStore((s) => s.data),
    apps = useRulesStore((s) => s.data.lockedApps),
    session = useSessionStore((s) => s.data.session),
    permission = branchPermission(activity);
  return (
    <>
      <Heading title={c.X5} support={c.completeBody} />
      <LivingIcon name="check" />
      <Checklist
        items={[
          c.checklist.screenTime,
          c.checklist.apps,
          c.checklist[permission],
          c.checklist.notifications,
          c.checklist.account,
        ]}
        checked={[
          permissions.screenTime === 'granted',
          !apps.isEmpty,
          ['granted', 'whenInUse', 'always'].includes(permissions[permission]),
          permissions.notifications === 'granted',
          session.kind === 'signedIn',
        ]}
      />
    </>
  );
}
