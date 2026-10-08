import { useEffect } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { Label } from '../../ui/Label';
import { Icon } from '../../ui/Icon';
import { Reveal } from '../../ui/Reveal';
import { tokens as t } from '../../ui/tokens';
import { useRuntime } from '../../ports/useRuntime';
import { researchRatingCopy as c } from '../researchRatingCopy';
import { requestOnboardingRating } from './ratingPrompt';

const laurel = Image.resolveAssetSource(require('../../../../assets/onboarding/laurel.svg')).uri;

function Stars() {
  return <View accessibilityLabel="5 stars" accessible style={s.stars}>
    {Array.from({ length: 5 }, (_, index) => <Icon key={index} name="star" variant="utility" size={t.icon.sm} />)}
  </View>;
}

function Laurel({ flip = false }: { flip?: boolean }) {
  return <SvgUri uri={laurel} width={t.control.indicator} height={t.control.full}
    style={{ width: t.control.indicator, height: t.control.full, transform: flip ? [{ scaleX: -1 }] : undefined }} />;
}

export function RatingScreen({ onPrompted }: { onPrompted: () => void }) {
  const runtime = useRuntime();
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      void requestOnboardingRating(runtime.review, () => active).finally(() => { if (active) onPrompted(); });
    }, t.motion.ratingPromptDelay);
    return () => { active = false; clearTimeout(timer); };
  }, [runtime, onPrompted]);
  return <View style={[StyleSheet.absoluteFill, { gap: t.space.lg }]}>
    <Label variant="display" style={{ textAlign: 'left' }}>{c.ratingTitle}</Label>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: t.space.lg, paddingBottom: t.space.lg }} showsVerticalScrollIndicator={false}>
      <Reveal style={[s.card, s.summary]}>
        <Laurel />
        <View style={{ alignItems: 'center' }}>
          <View style={[s.row, { gap: t.space.sm }]}>
            <Label variant="section" style={{ alignSelf: 'center' }}>{c.rating}</Label>
            <Stars />
          </View>
          <Label variant="support" tone="secondary" style={{ alignSelf: 'center' }}>{c.ratingCount}</Label>
        </View>
        <Laurel flip />
      </Reveal>
      <View style={{ gap: t.space.sm, alignItems: 'center', paddingVertical: t.space.sm }}>
        <Label variant="section">{c.communityTitle}</Label>
        <View style={{ flexDirection: 'row', justifyContent: 'center', paddingLeft: t.space.sm }}>
          {c.reviews.slice(0, 4).map((review) => <Image key={review.name} source={review.photo} style={[s.crowd, { marginLeft: -t.space.sm }]} />)}
        </View>
        <Label variant="support" tone="secondary">{c.communityCount}</Label>
      </View>
      {c.reviews.map((review, index) => <Reveal key={review.name} index={index} style={[s.card, { gap: t.space.sm }]}>
        <View style={s.row}>
          <Image source={review.photo} style={s.face} />
          <Label variant="label" style={{ flex: 1, textAlign: 'left', alignSelf: 'center' }}>{review.name}</Label>
          <Stars />
        </View>
        <Label variant="support" tone="secondary" style={{ textAlign: 'left' }}>{review.text}</Label>
      </Reveal>)}
    </ScrollView>
  </View>;
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  card: { paddingHorizontal: t.space.lg, paddingVertical: t.space.md, backgroundColor: t.surface.softChoice, borderWidth: t.stroke.hairline, borderColor: t.surface.transparent, borderRadius: t.radius.card },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.space.sm },
  crowd: { width: t.control.full, height: t.control.full, borderRadius: t.radius.pill, borderWidth: t.stroke.selected, borderColor: t.surface.card },
  face: { width: t.control.inline, height: t.control.inline, borderRadius: t.radius.pill },
  stars: { flexDirection: 'row', gap: t.space.xs, alignSelf: 'center' },
});
