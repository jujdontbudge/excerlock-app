import { SupportFormScreen } from './SupportFormScreen';
import { supportCopy as s } from '../../content/support';
export function FeedbackScreen({ onBack }: { onBack?: () => void }) {
  return (
    <SupportFormScreen
      onBack={onBack}
      category="Idea"
      title={s.feedbackTitle}
      support={s.feedbackSupport}
      field={s.feedbackField}
      placeholder={s.feedbackPlaceholder}
      submit={s.feedbackSend}
      sent={s.feedbackSent}
      icon="mail"
    />
  );
}
