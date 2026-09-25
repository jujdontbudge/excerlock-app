import { SupportFormScreen } from './lib/SupportFormScreen';
import { supportCopy as s } from './supportCopy';
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
