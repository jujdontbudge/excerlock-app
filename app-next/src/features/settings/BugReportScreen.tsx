import { SupportFormScreen } from './SupportFormScreen';
import { supportCopy as s } from '../../content/support';
export function BugReportScreen({ onBack }: { onBack?: () => void }) {
  return (
    <SupportFormScreen
      onBack={onBack}
      category="Problem"
      title={s.bugTitle}
      support={s.bugSupport}
      field={s.bugField}
      placeholder={s.bugPlaceholder}
      submit={s.bugSend}
      sent={s.bugSent}
      icon="mail"
      deviceInfo
    />
  );
}
