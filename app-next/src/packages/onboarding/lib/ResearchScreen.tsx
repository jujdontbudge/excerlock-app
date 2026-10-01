import { Image, View, useWindowDimensions } from 'react-native';
import { Label } from '../../ui/Label';
import { Reveal } from '../../ui/Reveal';
import { tokens as t } from '../../ui/tokens';
import { researchRatingCopy as c } from '../researchRatingCopy';

export function ResearchScreen() {
  const { width } = useWindowDimensions();
  return <View style={{ flexGrow: 1, gap: t.space.xl, justifyContent: 'space-evenly' }}>
    <Label variant="display">{c.researchTitle}<Label variant="display" style={{ color: t.brand.primary }}>{c.emphasis}</Label>{c.researchEnd}</Label>
    <View style={{ gap: t.space.xxl, alignItems: 'center' }}>
      {c.universities.map((university, index) => <Reveal key={university.name} index={index} style={{ alignItems: 'center' }}>
        <Image source={university.logo} accessibilityLabel={university.name} accessible resizeMode="contain"
          style={{ width: width * university.share, height: (width * university.share) / university.aspectRatio }} />
      </Reveal>)}
    </View>
    <Reveal index={c.universities.length} style={{ gap: t.space.sm }}>
      {c.principles.map((principle) => <Label key={principle} variant="body">{principle}</Label>)}
    </Reveal>
  </View>;
}
