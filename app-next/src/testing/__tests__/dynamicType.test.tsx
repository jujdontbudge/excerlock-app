import { Text, View, Dimensions } from 'react-native';
import { render } from '@testing-library/react-native';
import { clipAudit, typeDigest, withFontScale, XL_FONT_SCALE } from '../dynamicType';

const label = (text: string, cap?: number) => (
  <Text allowFontScaling maxFontSizeMultiplier={cap} style={{ fontSize: 14, lineHeight: 20 }}>
    {text}
  </Text>
);
const json = async (element: React.ReactElement) => (await render(element)).toJSON();

test('a fixed-height view that cannot hold its scaled text is a finding', async () => {
  const tree = await json(<View style={{ height: 30 }}>{label('Walk 5,000 steps')}</View>);
  expect(clipAudit(tree, XL_FONT_SCALE)).toEqual([{ text: 'Walk 5,000 steps', height: 30, needs: 40 }]);
  expect(clipAudit(tree, 1)).toEqual([]);
});

test('a font-size cap, a row layout and absolute layers all reduce the room text needs', async () => {
  expect(clipAudit(await json(<View style={{ height: 30 }}>{label('Capped', 1.5)}</View>))).toEqual([]);
  const column = await json(
    <View style={{ height: 50 }}>
      {label('One')}
      {label('Two')}
    </View>,
  );
  expect(clipAudit(column)).toEqual([{ text: 'OneTwo', height: 50, needs: 80 }]);
  const row = await json(
    <View style={{ height: 50, flexDirection: 'row' }}>
      {label('One')}
      {label('Two')}
    </View>,
  );
  expect(clipAudit(row)).toEqual([]);
  const layers = await json(
    <View style={{ height: 50 }}>
      <View style={{ position: 'absolute' }}>{label('One')}</View>
      <View style={{ position: 'absolute' }}>{label('Two')}</View>
    </View>,
  );
  expect(clipAudit(layers)).toEqual([]);
});

test('min-height boxes are never findings and the digest records how each string scales', async () => {
  const tree = await json(<View style={{ minHeight: 30 }}>{label('Grows', 1.6)}</View>);
  expect(clipAudit(tree)).toEqual([]);
  expect(typeDigest(tree)).toEqual([{ text: 'Grows', scales: true, cap: 1.6 }]);
});

test('withFontScale reports the scale through Dimensions and restores it', async () => {
  const before = Dimensions.get('window').fontScale;
  await withFontScale(3, async () => expect(Dimensions.get('window').fontScale).toBe(3));
  expect(Dimensions.get('window').fontScale).toBe(before);
});
