import { Image, View } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { Label } from '../../ui/Label';
import { Reveal } from '../../ui/Reveal';
import { tokens as t } from '../../ui/tokens';
import { researchRatingCopy as c } from '../researchRatingCopy';

export function ResearchScreen() {
  return <View style={{ flexGrow: 1, gap: t.space.xl, justifyContent: 'space-evenly' }}>
    <Label variant="display">{c.researchTitle}<Label variant="display" style={{ color: t.brand.primary }}>{c.emphasis}</Label>{c.researchEnd}</Label>
    <View style={{ gap: t.space.lg }}>
      {c.universities.map((university, index) => <Reveal key={university.name} index={index}>
        <SvgUri uri={Image.resolveAssetSource(university.photo).uri} accessibilityLabel={university.name} accessible
          width="100%" height={t.control.full} />
      </Reveal>)}
    </View>
    <Reveal index={c.universities.length} style={{ gap: t.space.xs }}>
      {c.principles.map((principle) => <Label key={principle} variant="label">{principle}</Label>)}
    </Reveal>
  </View>;
}
