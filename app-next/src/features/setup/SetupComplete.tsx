import { Heading, Checklist } from '../../design-system';
import { LivingIcon } from '../../motion/LivingIcon';
import { setupCopy as c } from '../../content/setup';
import { permissionsStore as usePermissionsStore } from '../../state/permissionsStore';
import { rulesStore as useRulesStore } from '../../state/rulesStore';
import { sessionStore as useSessionStore } from '../../state/sessionStore';
import { branchPermission } from '../../onboarding/setupFlow';
import { Activity } from '../../domain/types';
export type SetupFix = 'X1' | 'X2' | 'X3b' | 'X4' | 'notifications';

export function SetupComplete({ activity, onFix }: { activity: Activity; onFix: (target: SetupFix) => void }) {
  const permissions = usePermissionsStore((s) => s.data),
    apps = useRulesStore((s) => s.data.lockedApps),
    session = useSessionStore((s) => s.data.session),
    permission = branchPermission(activity),
    checked = [
      permissions.screenTime === 'granted',
      apps.appCount + apps.categoryCount > 0,
      ['granted', 'whenInUse', 'always'].includes(permissions[permission]),
      permissions.notifications === 'granted',
      session.kind === 'signedIn',
    ],
    missing = c.checklistMissing,
    support = [missing.screenTime, missing.apps, missing[permission], missing.notifications, missing.account].map(
      (copy, index) => (checked[index] ? undefined : copy),
    ),
    fixes: SetupFix[] = ['X1', 'X2', 'X3b', 'notifications', 'X4'],
    complete = checked.every(Boolean);
  return (
    <>
      <Heading title={complete ? c.X5 : c.incompleteTitle} support={complete ? c.completeBody : c.incompleteBody} />
      <LivingIcon name="check" />
      <Checklist
        items={[
          c.checklist.screenTime,
          c.checklist.apps,
          c.checklist[permission],
          c.checklist.notifications,
          c.checklist.account,
        ]}
        checked={checked}
        support={support}
        onPress={checked.map((done, index) => (done ? undefined : () => onFix(fixes[index])))}
      />
    </>
  );
}
