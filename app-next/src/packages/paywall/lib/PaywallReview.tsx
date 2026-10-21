import { View } from 'react-native';
import { Icon } from '../../ui/Icon';
import { Label } from '../../ui/Label';
import { Reveal } from '../../ui/Reveal';
import { tokens as t } from '../../ui/tokens';
import { paywallCopy as c } from './paywallCopy';

export function PaywallReview() {
  return (
    <Reveal index={1}>
      <View style={{ alignItems: 'center', gap: t.space.sm }}>
        <View accessible accessibilityLabel={c.review.stars} style={{ flexDirection: 'row', gap: t.space.xs }}>
          {Array.from({ length: 5 }, (_, index) => (
            <Icon key={index} name="star" size={t.icon.lg} />
          ))}
        </View>
        <Label variant="label" style={{ textAlign: 'center', fontFamily: t.font.bold }}>
          {c.review.title}
        </Label>
        <Label variant="body" style={{ textAlign: 'center' }}>
          {c.review.quote}
        </Label>
        <Label variant="support" tone="secondary" style={{ textAlign: 'center' }}>
          {c.review.byline}
        </Label>
      </View>
    </Reveal>
  );
}
