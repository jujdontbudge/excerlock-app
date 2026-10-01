import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { Label } from '../../ui/Label';
import { Icon } from '../../ui/Icon';
import { Reveal } from '../../ui/Reveal';
import { tokens as t } from '../../ui/tokens';
import { useRuntime } from '../../ports/useRuntime';
import { researchRatingCopy as c } from '../researchRatingCopy';
import { requestOnboardingRating } from './ratingPrompt';

function Stars() {
  return <View accessibilityLabel="5 stars" accessible style={s.stars}>
    {Array.from({ length: 5 }, (_, index) => <Icon key={index} name="star" variant="utility" size={t.icon.sm} />)}
  </View>;
}

export function RatingScreen() {
  const runtime = useRuntime();
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => { void requestOnboardingRating(runtime.review, () => active); }, 800);
    return () => { active = false; clearTimeout(timer); };
  }, [runtime]);
  return <View style={{ gap: t.space.xl }}>
    <View style={s.row}>
      <Label variant="display" style={{ flex: 1 }}>{c.ratingTitle}</Label>
      <Image source={require('../../../../assets/running-lock.png')} accessibilityLabel="ExcerLock" style={{ width: t.control.row, height: t.control.row, borderRadius: t.radius.field }} />
    </View>
    <Reveal style={s.card}>
      <View style={[s.row, { justifyContent: 'center', gap: t.space.lg }]}>
        <SvgUri uri={Image.resolveAssetSource(require('../../../../assets/onboarding/laurel.svg')).uri} width={t.control.full} height={t.layout.ring} style={{ width: t.control.full, height: t.layout.ring }} />
        <View style={{ gap: t.space.sm }}><Label variant="metric">{c.rating}</Label><Stars /></View>
        <SvgUri uri={Image.resolveAssetSource(require('../../../../assets/onboarding/laurel.svg')).uri} width={t.control.full} height={t.layout.ring} style={{ width: t.control.full, height: t.layout.ring, transform: [{ scaleX: -1 }] }} />
      </View>
      <Label variant="support">{c.ratingCount}</Label>
    </Reveal>
    <View style={{ gap: t.space.md }}>
      <Label variant="section">{c.communityTitle}</Label>
      <View style={{ flexDirection: 'row', justifyContent: 'center', paddingLeft: t.space.md }}>
        {c.reviews.slice(0, 4).map((review) => <Image key={review.name} source={review.photo} style={[s.face, { marginLeft: -t.space.md }]} />)}
      </View>
      <Label variant="support">{c.communityCount}</Label>
    </View>
    <View style={{ gap: t.space.md }}>
      {c.reviews.map((review, index) => <Reveal key={review.name} index={index} style={s.card}>
        <View style={s.row}>
          <Image source={review.photo} style={s.face} />
          <Label variant="label" style={{ flex: 1 }}>{review.name}</Label>
          <Stars />
        </View>
        <Label>{review.text}</Label>
      </Reveal>)}
    </View>
  </View>;
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  card: { padding: t.space.lg, gap: t.space.md, backgroundColor: t.surface.card, borderWidth: t.stroke.hairline, borderColor: t.border.outline, borderRadius: t.radius.card },
  face: { width: t.control.inline, height: t.control.inline, borderRadius: t.radius.pill, borderWidth: t.stroke.hairline, borderColor: t.border.outline },
  stars: { flexDirection: 'row', gap: t.space.xs, alignSelf: 'center' },
});
