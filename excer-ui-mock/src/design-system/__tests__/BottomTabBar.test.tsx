import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { assetRegistry } from '@/content';

import { BottomTabBar } from '../BottomTabBar';
import { colors } from '../tokens';

const safeAreaMetrics = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 47 },
};

describe('BottomTabBar', () => {
  it('runtime-tints Family-B glyphs for their selected state', async () => {
    const view = await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <BottomTabBar
          activeKey="home"
          items={[
            { icon: assetRegistry.glyphs['icon-tab-home'], key: 'home', label: 'Home' },
            { icon: assetRegistry.glyphs['icon-tab-chart'], key: 'analysis', label: 'Analysis' },
          ]}
          onSelect={jest.fn()}
        />
      </SafeAreaProvider>,
    );

    expect(view.getByTestId('bottom-tab-icon-home').props.tintColor).toBe(colors.icon.primary);
    expect(view.getByTestId('bottom-tab-icon-analysis').props.tintColor).toBe(colors.icon.inactive);
  });
});
